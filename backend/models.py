from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class UserCriteria(BaseModel):
    max_budget: float = 170000.0
    savings_available: float = 65000.0
    clm_itp_percent: float = 9.0
    min_rooms: int = 1
    preferred_rooms: int = 2
    blacklisted_neighborhoods: List[str] = [
        "las 600", "la milagrosa", "el congo", "churruca", "sector 3", "cerro de san blas"
    ]
    require_elevator: bool = True
    desire_garage: bool = True
    prefer_ready_to_move: bool = True
    interest_rate_percent: float = 2.75
    mortgage_term_years: int = 30
    mortgage_percentage: float = 80.0

class PricePoint(BaseModel):
    date: str
    price: float

class ScoreBreakdown(BaseModel):
    total_score: float
    price_score: float
    elevator_score: float
    rooms_score: float
    garage_score: float
    neighborhood_score: float
    condition_score: float
    extras_score: float
    pros: List[str] = []
    cons: List[str] = []
    is_blacklisted: bool = False
    blacklist_reason: Optional[str] = None

class FinancialBreakdown(BaseModel):
    purchase_price: float
    itp_tax: float
    notary_fee: float
    registry_fee: float
    management_fee: float
    valuation_fee: float
    total_expenses: float
    total_operation_cost: float
    down_payment_needed: float
    total_cash_needed: float
    savings_available: float
    savings_remaining: float
    is_solvent: bool
    loan_amount: float
    monthly_mortgage_payment: float

class VisitChecklist(BaseModel):
    property_id: str
    visited_at: Optional[str] = None
    noise_level: int = 3  # 1 to 5 (1 = muy ruidoso, 5 = muy silencioso)
    natural_light: int = 3  # 1 to 5
    building_condition: int = 3  # 1 to 5
    dampness_detected: bool = False
    water_pressure_good: bool = True
    electric_panel_updated: bool = True
    pending_derramas: str = "ninguna"  # ninguna, posible, aprobada
    community_fee_confirmed: Optional[float] = None
    ibi_annual: Optional[float] = None
    seller_motivation: Optional[str] = None
    notes: Optional[str] = None
    would_buy: Optional[bool] = None

class Property(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: Optional[str] = None
    source: str = "manual"  # idealista, fotocasa, pisos.com, manual
    price: float
    original_price: Optional[float] = None
    price_history: List[PricePoint] = []
    neighborhood: str = "Albacete"
    address: Optional[str] = None
    rooms: int = 2
    bathrooms: int = 1
    area_m2: float = 80.0
    floor: Optional[int] = None
    has_elevator: bool = True
    has_garage: bool = False
    has_terrace: bool = False
    has_balcony: bool = False
    has_ac: bool = False
    is_exterior: bool = True
    heating_type: str = "gas_natural"  # gas_natural, central, electrica, ninguna
    condition: str = "para_entrar_a_vivir"  # para_entrar_a_vivir, buen_estado, a_reformar
    community_fee: Optional[float] = None
    description: Optional[str] = None
    photos: List[str] = []
    contact_phone: Optional[str] = None
    agency: Optional[str] = None
    status: str = "nuevo"  # nuevo, interesante, contactado, visita_agendada, visitado, oferta, descartado
    discard_reason: Optional[str] = None
    user_notes: Optional[str] = None
    score: float = 0.0
    score_breakdown: Optional[ScoreBreakdown] = None
    financials: Optional[FinancialBreakdown] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
