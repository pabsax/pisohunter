import pytest
import sys
from pathlib import Path

# Añadir backend al path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models import Property, UserCriteria
from scoring import evaluate_property
from finance import calculate_financials

def test_financial_calculations_clm():
    criteria = UserCriteria(
        max_budget=170000.0,
        savings_available=65000.0,
        clm_itp_percent=9.0,
        interest_rate_percent=2.75,
        mortgage_term_years=30,
        mortgage_percentage=80.0
    )
    
    fin = calculate_financials(170000.0, criteria)
    
    # 9% de 170.000 = 15.300 €
    assert fin.itp_tax == 15300.0
    # Entrada 20% = 34.000 €
    assert fin.down_payment_needed == 34000.0
    # Préstamo 80% = 136.000 €
    assert fin.loan_amount == 136000.0
    # Fondos propios necesarios ~ 51.000 - 53.000 €
    assert 51000 <= fin.total_cash_needed <= 53000
    # Con 65.000 € de ahorros, es solvente y le sobran más de 12.000 €
    assert fin.is_solvent is True
    assert fin.savings_remaining > 12000.0
    # Cuota hipotecaria mensual en torno a 550 €/mes
    assert 500 <= fin.monthly_mortgage_payment <= 600

def test_elevator_penalty():
    criteria = UserCriteria()
    
    # Piso con ascensor
    prop_with_elevator = Property(
        title="Piso 3º con ascensor",
        neighborhood="Ensanche",
        price=130000.0,
        floor=3,
        has_elevator=True
    )
    score_with = evaluate_property(prop_with_elevator, criteria)
    assert score_with.elevator_score == 25.0
    
    # Piso 3º sin ascensor (debe penalizar drásticamente)
    prop_without_elevator = Property(
        title="Piso 3º sin ascensor",
        neighborhood="Ensanche",
        price=130000.0,
        floor=3,
        has_elevator=False
    )
    score_without = evaluate_property(prop_without_elevator, criteria)
    assert score_without.elevator_score == 0.0
    assert score_without.total_score < score_with.total_score - 20

def test_blacklist_zones():
    criteria = UserCriteria(blacklisted_neighborhoods=["las 600", "churruca", "el congo"])
    
    prop_banned = Property(
        title="Oportunidad en Las 600",
        neighborhood="Las 600",
        price=50000.0
    )
    score_banned = evaluate_property(prop_banned, criteria)
    assert score_banned.is_blacklisted is True
    assert score_banned.total_score == 0.0

def test_garage_bonus():
    criteria = UserCriteria()
    
    p1 = Property(title="Piso con garaje", neighborhood="Feria", price=140000.0, has_garage=True)
    p2 = Property(title="Piso sin garaje", neighborhood="Feria", price=140000.0, has_garage=False)
    
    s1 = evaluate_property(p1, criteria)
    s2 = evaluate_property(p2, criteria)
    
    assert s1.garage_score > s2.garage_score
    assert s1.total_score > s2.total_score

def test_api_endpoints():
    from fastapi.testclient import TestClient
    from main import app
    
    with TestClient(app) as client:
        # 1. Health
        res_health = client.get("/api/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "ok"
        
        # 2. Properties
        res_props = client.get("/api/properties")
        assert res_props.status_code == 200
        props = res_props.json()
        assert len(props) > 0

    
        # Verificar que el piso en Las 600 está descartado o tiene score 0
        banned = [p for p in props if "600" in p["neighborhood"].lower() or "milagrosa" in p["title"].lower()]
        if banned:
            assert banned[0]["score"] == 0.0
            assert banned[0]["status"] == "descartado"
            
        # 3. Criteria
        res_crit = client.get("/api/criteria")
        assert res_crit.status_code == 200
        crit = res_crit.json()
        assert crit["max_budget"] == 170000.0
        assert crit["savings_available"] == 65000.0
        
        # 4. Simulation
        res_sim = client.get("/api/finance/simulate?price=150000")
        assert res_sim.status_code == 200
        sim = res_sim.json()
        assert sim["itp_tax"] == 13500.0
        assert sim["is_solvent"] is True

def test_anti_rent_and_tenant_detection():
    criteria = UserCriteria()
    
    # Inquilina mencionada
    prop_tenant = Property(
        title="Piso en Ensanche",
        neighborhood="Ensanche",
        price=140000.0,
        description="Se vende piso muy luminoso. Los muebles se los llevará la inquilina antes de la firma."
    )
    score_tenant = evaluate_property(prop_tenant, criteria)
    assert score_tenant.is_blacklisted is True
    assert score_tenant.total_score == 0.0

    # Actualmente alquilado
    prop_rented = Property(
        title="Apartamento centrico",
        neighborhood="Centro",
        price=130000.0,
        description="Excelente inversión, actualmente alquilado a una sola persona con renta demostrable."
    )
    score_rented = evaluate_property(prop_rented, criteria)
    assert score_rented.is_blacklisted is True
    assert score_rented.total_score == 0.0

    # Título que es anuncio de alquiler
    prop_ad_rent = Property(
        title="INMOBILIARIA alquila apartamento totalmente amueblado",
        neighborhood="Estacion",
        price=120000.0
    )
    score_ad_rent = evaluate_property(prop_ad_rent, criteria)
    assert score_ad_rent.is_blacklisted is True
    assert score_ad_rent.total_score == 0.0

def test_cheap_and_calle_burgos_filtering():
    criteria = UserCriteria()

    # Piso < 65k (ejemplo el de 60k en Calle Burgos)
    prop_cheap = Property(
        title="Piso en calle de Burgos",
        neighborhood="Hospital-Parque Sur",
        price=60000.0
    )
    score_cheap = evaluate_property(prop_cheap, criteria)
    assert score_cheap.is_blacklisted is True
    assert score_cheap.total_score == 0.0
    assert "anormalmente bajo" in score_cheap.blacklist_reason or "calle burgos" in score_cheap.blacklist_reason.lower()

def test_deduplication_engine():
    from database import properties_are_duplicates

    p1 = Property(
        id="uuid-1",
        title="Piso en Carretas",
        neighborhood="Carretas",
        price=110000.0,
        rooms=3,
        area_m2=90.0,
        has_elevator=True,
        photos=["https://cdn.example.com/photo123.jpg"]
    )
    p2 = Property(
        id="uuid-2",
        title="Graciano Inmobiliaria vende piso en Carretas",
        neighborhood="Carretas - Pajarita",
        price=110000.0,
        rooms=3,
        area_m2=90.0,
        has_elevator=True,
        photos=["https://cdn.example.com/photo123.jpg?w=800"]
    )

    assert properties_are_duplicates(p1, p2) is True

def test_favorite_and_user_notes():
    from database import (
        save_property, get_property_by_id,
        update_property_favorite, update_property_notes
    )
    test_p = Property(
        id="test-prop-notes-fav",
        title="Piso de prueba para notas y favoritos",
        neighborhood="Centro",
        price=125000.0,
        rooms=2,
        area_m2=75.0,
        has_elevator=True
    )
    save_property(test_p)
    
    # 1. Update favorite
    up_fav = update_property_favorite("test-prop-notes-fav", True)
    assert up_fav.is_favorite is True
    
    # 2. Update notes
    up_notes = update_property_notes("test-prop-notes-fav", "Preguntar por derramas de tejado")
    assert up_notes.user_notes == "Preguntar por derramas de tejado"
    assert up_notes.is_favorite is True
    
    # 3. Verify persistent retrieval
    fetched = get_property_by_id("test-prop-notes-fav")
    assert fetched is not None
    assert fetched.is_favorite is True
    assert fetched.user_notes == "Preguntar por derramas de tejado"
