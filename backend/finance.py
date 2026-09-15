import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from models import FinancialBreakdown, UserCriteria

def calculate_financials(price: float, criteria: UserCriteria = None) -> FinancialBreakdown:
    """
    Calcula de forma rigurosa los costes de compraventa en Castilla-La Mancha (Albacete)
    e hipoteca según los ahorros disponibles del usuario (65k) y tipo impositivo ITP (9%).
    """
    if criteria is None:
        criteria = UserCriteria()
    
    # 1. Impuesto de Transmisiones Patrimoniales (ITP en Castilla-La Mancha)
    itp_tax = round(price * (criteria.clm_itp_percent / 100.0), 2)
    
    # 2. Notaría (Arancel oficial español para compraventa de vivienda)
    # Escala orientativa regulada por el Real Decreto 1426/1989
    if price <= 100000:
        notary_fee = 750.0
    elif price <= 150000:
        notary_fee = 850.0
    elif price <= 200000:
        notary_fee = 950.0
    else:
        notary_fee = 1100.0
        
    # 3. Registro de la Propiedad (Arancel oficial español)
    if price <= 100000:
        registry_fee = 380.0
    elif price <= 150000:
        registry_fee = 450.0
    else:
        registry_fee = 520.0
        
    # 4. Gestoría y Tasación
    management_fee = 350.0
    valuation_fee = 360.0
    
    # Total gastos adicionales
    total_expenses = round(itp_tax + notary_fee + registry_fee + management_fee + valuation_fee, 2)
    total_operation_cost = round(price + total_expenses, 2)
    
    # 5. Financiación Hipotecaria (80% estándar)
    loan_pct = criteria.mortgage_percentage / 100.0
    loan_amount = round(price * loan_pct, 2)
    down_payment_needed = round(price * (1.0 - loan_pct), 2)
    
    # Total efectivo necesario para firmar la compra = Entrada + Gastos/Impuestos
    total_cash_needed = round(down_payment_needed + total_expenses, 2)
    
    # Evaluación de solvencia frente a los ahorros (65k)
    savings_available = criteria.savings_available
    savings_remaining = round(savings_available - total_cash_needed, 2)
    is_solvent = savings_remaining >= 0.0
    
    # 6. Cuota mensual de hipoteca (Sistema de amortización francés)
    monthly_interest = (criteria.interest_rate_percent / 100.0) / 12.0
    total_months = criteria.mortgage_term_years * 12
    
    if monthly_interest > 0 and total_months > 0:
        factor = (1.0 + monthly_interest) ** total_months
        monthly_mortgage_payment = round(loan_amount * (monthly_interest * factor) / (factor - 1.0), 2)
    else:
        monthly_mortgage_payment = round(loan_amount / max(1, total_months), 2)
        
    return FinancialBreakdown(
        purchase_price=price,
        itp_tax=itp_tax,
        notary_fee=notary_fee,
        registry_fee=registry_fee,
        management_fee=management_fee,
        valuation_fee=valuation_fee,
        total_expenses=total_expenses,
        total_operation_cost=total_operation_cost,
        down_payment_needed=down_payment_needed,
        total_cash_needed=total_cash_needed,
        savings_available=savings_available,
        savings_remaining=savings_remaining,
        is_solvent=is_solvent,
        loan_amount=loan_amount,
        monthly_mortgage_payment=monthly_mortgage_payment
    )


def calculate_expenses_at_price(price: float, itp_percent: float = 9.0) -> dict:
    """Calcula el desglose de gastos e impuestos oficiales para un precio de compra en CLM"""
    itp_tax = round(price * (itp_percent / 100.0), 2)
    if price <= 100000:
        notary_fee = 750.0
    elif price <= 150000:
        notary_fee = 850.0
    elif price <= 200000:
        notary_fee = 950.0
    else:
        notary_fee = 1100.0

    if price <= 100000:
        registry_fee = 380.0
    elif price <= 150000:
        registry_fee = 450.0
    else:
        registry_fee = 520.0

    management_fee = 350.0
    valuation_fee = 360.0
    total_expenses = round(itp_tax + notary_fee + registry_fee + management_fee + valuation_fee, 2)
    return {
        "itp_tax": itp_tax,
        "notary_fee": notary_fee,
        "registry_fee": registry_fee,
        "management_fee": management_fee,
        "valuation_fee": valuation_fee,
        "total_expenses": total_expenses
    }


def calculate_purchasing_power(
    salary: float = 1400.0,
    second_salary: float = 0.0,
    savings_to_disburse: float = 65000.0,
    savings_total: float = 65000.0,
    dti_limit_percent: float = 35.0,
    interest_rate_percent: float = 2.75,
    mortgage_term_years: int = 30,
    itp_percent: float = 9.0,
    expected_discount_percent: float = 5.0
) -> dict:
    """
    Calcula con rigor bancario y fiscal:
    1. Cuota máxima admisible por riesgos bancarios (DTI Banco de España, ej. 35% de 1.400€ = 490€/mes).
    2. Préstamo hipotecario máximo que concede la entidad financiera.
    3. Tope real de compra en notaría (escrituración) según el efectivo que se decida desembolsar.
    4. Tope de precio en anuncio en portales (Idealista/Fotocasa) contando con la rebaja negociada.
    5. Escenarios con distintos márgenes de negociación (3%, 5%, 7%, 10%, 12%).
    """
    total_monthly_income = round(salary + second_salary, 2)
    dti_ratio = dti_limit_percent / 100.0
    max_monthly_payment = round(total_monthly_income * dti_ratio, 2)

    # Amortización francesa para calcular el capital máximo prestable con esa cuota
    monthly_interest = (interest_rate_percent / 100.0) / 12.0
    total_months = mortgage_term_years * 12
    if monthly_interest > 0 and total_months > 0:
        factor = (1.0 + monthly_interest) ** total_months
        max_mortgage_loan = round(max_monthly_payment * (factor - 1.0) / (monthly_interest * factor), 2)
    else:
        max_mortgage_loan = round(max_monthly_payment * total_months, 2)

    # Búsqueda dicotómica de precisión del precio máximo escriturado que se puede pagar con el efectivo aportado
    low = 10000.0
    high = 350000.0
    best_deed_price = low

    for _ in range(60):
        mid = (low + high) / 2.0
        exp = calculate_expenses_at_price(mid, itp_percent)
        # El banco financia como máximo el 80% del valor, y sin superar el límite de cuota (max_mortgage_loan)
        loan_for_price = min(max_mortgage_loan, round(mid * 0.80, 2))
        down_payment = round(mid - loan_for_price, 2)
        cash_needed = round(down_payment + exp["total_expenses"], 2)

        if cash_needed <= savings_to_disburse:
            best_deed_price = mid
            low = mid
        else:
            high = mid

    max_deed_price = round(best_deed_price, 0)
    
    # Desglose detallado al precio tope
    expenses_at_ceiling = calculate_expenses_at_price(max_deed_price, itp_percent)
    loan_at_ceiling = min(max_mortgage_loan, round(max_deed_price * 0.80, 2))
    down_payment_at_ceiling = round(max_deed_price - loan_at_ceiling, 2)
    total_cash_at_ceiling = round(down_payment_at_ceiling + expenses_at_ceiling["total_expenses"], 2)
    
    # Cuota real al precio tope
    if monthly_interest > 0 and total_months > 0:
        f = (1.0 + monthly_interest) ** total_months
        monthly_payment_at_ceiling = round(loan_at_ceiling * (monthly_interest * f) / (f - 1.0), 2)
    else:
        monthly_payment_at_ceiling = round(loan_at_ceiling / total_months, 2)
        
    actual_dti_at_ceiling = round((monthly_payment_at_ceiling / total_monthly_income) * 100.0, 1) if total_monthly_income > 0 else 0.0

    # Tope en portales con negociación
    discount_ratio = expected_discount_percent / 100.0
    max_portal_listing_price = round(max_deed_price / max(0.01, (1.0 - discount_ratio)), 0)

    # Colchón de seguridad
    cushion_retained = round(max(0.0, savings_total - total_cash_at_ceiling), 2)

    # Escenarios habituales en Albacete
    discount_steps = [0, 3, 5, 7, 10, 12, 15]
    scenarios = []
    for disc in discount_steps:
        p_portal = round(max_deed_price / (1.0 - (disc / 100.0)), 0)
        savings_amount = round(p_portal - max_deed_price, 0)
        scenarios.append({
            "discount_percent": disc,
            "max_listing_price": p_portal,
            "deed_offer_price": max_deed_price,
            "negotiated_savings": savings_amount,
            "description": "Sin rebaja (precio cerrado)" if disc == 0 else (
                "Rebaja mínima habitual" if disc == 3 else (
                    "Rebaja estándar en Albacete" if disc == 5 else (
                        "Buena negociación" if disc == 7 else (
                            "Piso con tiempo a la venta" if disc == 10 else "Fuerte descuento"
                        )
                    )
                )
            )
        })

    return {
        "monthly_net_income": salary,
        "second_income": second_salary,
        "total_monthly_income": total_monthly_income,
        "dti_limit_percent": dti_limit_percent,
        "max_monthly_payment": max_monthly_payment,
        "interest_rate_percent": interest_rate_percent,
        "mortgage_term_years": mortgage_term_years,
        "max_mortgage_loan": max_mortgage_loan,
        "savings_to_disburse": savings_to_disburse,
        "savings_total": savings_total,
        "cushion_retained": cushion_retained,
        "expected_discount_percent": expected_discount_percent,
        "max_deed_price": max_deed_price,
        "max_portal_listing_price": max_portal_listing_price,
        "loan_at_ceiling": loan_at_ceiling,
        "down_payment_at_ceiling": down_payment_at_ceiling,
        "monthly_payment_at_ceiling": monthly_payment_at_ceiling,
        "actual_dti_at_ceiling": actual_dti_at_ceiling,
        "total_cash_needed": total_cash_at_ceiling,
        "expenses": expenses_at_ceiling,
        "scenarios": scenarios
    }

