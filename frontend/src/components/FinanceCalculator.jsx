import React, { useState, useEffect } from 'react';
import { Calculator, Check, AlertCircle, Shield, TrendingDown, HelpCircle, ArrowUpRight } from 'lucide-react';

export default function FinanceCalculator() {
  // Inputs
  const [salary, setSalary] = useState(1400);
  const [hasSecondIncome, setHasSecondIncome] = useState(false);
  const [secondSalary, setSecondSalary] = useState(0);
  
  const [savingsTotal, setSavingsTotal] = useState(65000);
  const [savingsToDisburse, setSavingsToDisburse] = useState(60000); // Default to saving a 5k cushion
  
  const [dtiLimit, setDtiLimit] = useState(35); // 35% standard bank limit
  const [interestRate, setInterestRate] = useState(2.75);
  const [years, setYears] = useState(30);
  const [expectedDiscount, setExpectedDiscount] = useState(5.0); // 5% negotiation margin
  
  // Specific Property Simulator
  const [sampleListingPrice, setSampleListingPrice] = useState(170000);
  const [sampleDiscountPercent, setSampleDiscountPercent] = useState(5);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch purchasing power calculations from backend
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      salary: salary || 0,
      second_salary: hasSecondIncome ? (secondSalary || 0) : 0,
      savings_to_disburse: savingsToDisburse || 0,
      savings_total: savingsTotal || 0,
      dti_limit_percent: dtiLimit,
      interest_rate_percent: interestRate,
      mortgage_term_years: years,
      itp_percent: 9.0,
      expected_discount_percent: expectedDiscount
    });

    fetch(`/api/finance/purchasing-power?${params.toString()}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching purchasing power:', err);
        setLoading(false);
      });
  }, [salary, hasSecondIncome, secondSalary, savingsTotal, savingsToDisburse, dtiLimit, interestRate, years, expectedDiscount]);

  // Calculations for specific property simulator
  const sampleOfferPrice = Math.round(sampleListingPrice * (1 - (sampleDiscountPercent / 100)));
  const sampleItp = Math.round(sampleOfferPrice * 0.09);
  const sampleNotaryRegistry = sampleOfferPrice <= 150000 ? 1300 : 1470;
  const sampleManagement = 710;
  const sampleExpenses = sampleItp + sampleNotaryRegistry + sampleManagement;
  
  // Bank loan for sample property (cannot exceed 80% and cannot exceed max bank capacity)
  const sampleMaxPossibleLoan = data ? data.max_mortgage_loan : 120000;
  const sampleLoan = Math.min(Math.round(sampleOfferPrice * 0.80), sampleMaxPossibleLoan);
  const sampleDownPayment = sampleOfferPrice - sampleLoan;
  const sampleCashNeeded = sampleDownPayment + sampleExpenses;
  
  // Sample monthly payment
  const monthlyR = (interestRate / 100) / 12;
  const totalMonths = years * 12;
  const factor = Math.pow(1 + monthlyR, totalMonths);
  const sampleMonthlyPayment = Math.round(sampleLoan * (monthlyR * factor) / (factor - 1));
  const sampleMaxAllowedPayment = data ? data.max_monthly_payment : 490;
  const isSamplePaymentOk = sampleMonthlyPayment <= sampleMaxAllowedPayment;
  const isSampleCashOk = sampleCashNeeded <= savingsTotal;
  const sampleCushionLeft = savingsTotal - sampleCashNeeded;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Title & Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Simulador de Capacidad Real & Límites Bancarios
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          ¿Cuánto puedo pagar realmente en Albacete?
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
          Calcula con precisión de riesgos bancarios el tope de hipoteca que te aprueba el banco, 
          el precio máximo de compra escriturada con tus ahorros y el precio de anuncio que puedes explorar 
          en los portales considerando el margen de negociación.
        </p>
      </div>

      {/* Top 2 Primary KPI Cards: Topes Reales */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Tope en Portales con Negociación */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#181922] to-[#12131a] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tope en Anuncios (Portales)
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 text-zinc-200 border border-white/10">
                Con -{expectedDiscount}% de rebaja
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {data.max_portal_listing_price.toLocaleString()} €
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                El precio máximo que puedes filtrar en <strong>Idealista, Fotocasa o Pisos.com</strong>. Si logras una rebaja del {expectedDiscount}%, la compra escriturada se ajusta exactamente a tu límite financiero.
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span>Rebaja a ofertar al vendedor:</span>
              <span className="font-semibold text-emerald-400">
                -{(data.max_portal_listing_price - data.max_deed_price).toLocaleString()} €
              </span>
            </div>
          </div>

          {/* Card 2: Tope Escriturado Notaría */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#181922] to-[#12131a] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tope Escriturado Máximo (Notaría)
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Límite Real 100% Viable
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {data.max_deed_price.toLocaleString()} €
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                El importe máximo final de compraventa firmado ante notario. Cubre el precio, la hipoteca concedida y todos los impuestos de Castilla-La Mancha (ITP 9% + Notaría).
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span>Cuota hipotecaria resultante:</span>
              <span className="font-semibold text-white">
                {data.monthly_payment_at_ceiling} €/mes <span className="text-[11px] text-zinc-500">({data.actual_dti_at_ceiling}% de tu sueldo)</span>
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Main Grid: Controls vs Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Controls */}
        <div className="lg:col-span-6 bg-[#111217] border border-white/[0.08] rounded-3xl p-6 space-y-6 text-xs">
          
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-4 h-4 text-zinc-400" />
            Parámetros Personales y Bancarios
          </h3>

          {/* Sueldo titular 1 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-zinc-300 font-medium">Sueldo neto mensual (Titular 1)</label>
              <span className="text-zinc-400 font-semibold">{salary.toLocaleString()} €/mes</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="50"
                value={salary}
                onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-semibold text-sm outline-none focus:border-white/30"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium text-xs">€/mes netos</span>
            </div>
          </div>

          {/* Segundo sueldo (opcional) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium flex items-center gap-2">
                <span>¿Añadir segundo sueldo (pareja / 2º titular)?</span>
              </label>
              <button
                type="button"
                onClick={() => setHasSecondIncome(!hasSecondIncome)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  hasSecondIncome ? 'bg-white text-black font-semibold' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {hasSecondIncome ? 'Activado' : 'Solo 1 titular'}
              </button>
            </div>

            {hasSecondIncome && (
              <div className="relative mt-2">
                <input
                  type="number"
                  step="50"
                  placeholder="Ej. 1100"
                  value={secondSalary}
                  onChange={(e) => setSecondSalary(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-semibold text-sm outline-none focus:border-white/30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium text-xs">€/mes netos</span>
              </div>
            )}
          </div>

          {/* Límite bancario DTI */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <label className="text-zinc-300 font-medium">Límite de endeudamiento del banco (DTI)</label>
              </div>
              <span className="text-xs font-semibold text-white">
                {dtiLimit}% = {Math.round((salary + (hasSecondIncome ? secondSalary : 0)) * (dtiLimit / 100))} €/mes máx
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDtiLimit(30)}
                className={`py-2 px-3 rounded-xl border text-center transition ${
                  dtiLimit === 30 
                    ? 'border-white bg-white/10 text-white font-semibold' 
                    : 'border-white/[0.06] bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="font-medium">30% (Prudente)</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {Math.round((salary + (hasSecondIncome ? secondSalary : 0)) * 0.30)} €/mes
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDtiLimit(35)}
                className={`py-2 px-3 rounded-xl border text-center transition ${
                  dtiLimit === 35 
                    ? 'border-white bg-white/10 text-white font-semibold' 
                    : 'border-white/[0.06] bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="font-medium">35% (Límite Banco de España)</div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                  {Math.round((salary + (hasSecondIncome ? secondSalary : 0)) * 0.35)} €/mes
                </div>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              El departamento de riesgos bancarios evalúa que tus cuotas no superen el 35% de tus ingresos netos. Con 1.400 €, la cuota máxima que te concederán es exactamente <strong>490 €/mes</strong>.
            </p>
          </div>

          {/* Ahorros y efectivo a desembolsar */}
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between items-baseline">
              <label className="text-zinc-300 font-medium">Efectivo que decides desembolsar</label>
              <span className="text-sm font-bold text-white">{savingsToDisburse.toLocaleString()} €</span>
            </div>
            <input
              type="range"
              min="40000"
              max={savingsTotal}
              step="1000"
              value={savingsToDisburse}
              onChange={(e) => setSavingsToDisburse(parseFloat(e.target.value))}
              className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-500">Aportar menos capital</span>
              <span className="text-emerald-400 font-medium">
                Colchón de seguridad guardado: +{(savingsTotal - savingsToDisburse).toLocaleString()} €
              </span>
            </div>

            {/* Total savings setting */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
              <span>Ahorros totales disponibles:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="1000"
                  value={savingsTotal}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSavingsTotal(val);
                    if (savingsToDisburse > val) setSavingsToDisburse(val);
                  }}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-right text-white font-medium outline-none"
                />
                <span>€</span>
              </div>
            </div>
          </div>

          {/* Margen de negociación en anuncio */}
          <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between items-baseline">
              <label className="text-zinc-300 font-medium">Margen de rebaja esperado en el anuncio</label>
              <span className="text-sm font-bold text-white">-{expectedDiscount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={expectedDiscount}
              onChange={(e) => setExpectedDiscount(parseFloat(e.target.value))}
              className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="flex gap-2">
              {[0, 3, 5, 7, 10].map(disc => (
                <button
                  key={disc}
                  type="button"
                  onClick={() => setExpectedDiscount(disc)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition ${
                    expectedDiscount === disc ? 'bg-white text-black font-semibold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {disc === 0 ? 'Sin rebaja' : `-${disc}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Condiciones hipoteca */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
            <div className="space-y-1">
              <label className="text-zinc-400 block">Tipo interés estimado</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400 block">Plazo de amortización</label>
              <select
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
              >
                <option value="25">25 años</option>
                <option value="30">30 años</option>
              </select>
            </div>
          </div>

        </div>

        {/* Right Column: Key Breakdown & Scenarios */}
        <div className="lg:col-span-6 space-y-6">
          
          {data && (
            <>
              {/* Resumen de Capacidad Hipotecaria */}
              <div className="bg-[#111217] border border-white/[0.08] rounded-3xl p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white text-sm">Dictamen de Riesgos Bancarios</h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ratio DTI: {data.actual_dti_at_ceiling}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/[0.06]">
                  <div>
                    <span className="text-zinc-400 block">Cuota mensual máxima:</span>
                    <span className="text-2xl font-bold text-white mt-0.5 block">
                      {data.max_monthly_payment.toLocaleString()} € <span className="text-xs font-normal text-zinc-400">/ mes</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                      Exactamente el {data.dti_limit_percent}% de tus {data.total_monthly_income.toLocaleString()} €
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block">Préstamo hipotecario máx:</span>
                    <span className="text-2xl font-bold text-white mt-0.5 block">
                      ~{data.max_mortgage_loan.toLocaleString()} €
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                      Al {data.interest_rate_percent}% a {data.mortgage_term_years} años
                    </span>
                  </div>
                </div>

                {/* Desglose de Gastos al Precio Tope */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Precio de compra escriturado (Tope):</span>
                    <span className="font-semibold text-white">{data.max_deed_price.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Hipoteca financiada por el banco:</span>
                    <span className="font-medium text-zinc-200">-{data.loan_at_ceiling.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Entrada que aportas en efectivo:</span>
                    <span className="font-medium text-white">{data.down_payment_at_ceiling.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>ITP Castilla-La Mancha (9.0%):</span>
                    <span className="font-medium text-white">+{data.expenses.itp_tax.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Notaría y Registro de la Propiedad:</span>
                    <span className="font-medium text-white">+{(data.expenses.notary_fee + data.expenses.registry_fee).toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Gestoría bancaria y Tasación oficial:</span>
                    <span className="font-medium text-white">+{(data.expenses.management_fee + data.expenses.valuation_fee).toLocaleString()} €</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/[0.08] text-sm">
                    <span className="font-semibold text-white">Total Efectivo Desembolsado:</span>
                    <span className="font-bold text-emerald-400">{data.total_cash_needed.toLocaleString()} €</span>
                  </div>
                </div>
              </div>

              {/* Escenarios de Negociación en Portales */}
              <div className="bg-[#111217] border border-white/[0.08] rounded-3xl p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white text-sm">Tabla de Rebajas en Albacete</h4>
                  <span className="text-[11px] text-zinc-500">¿Qué anuncio mirar según rebaja?</span>
                </div>

                <div className="space-y-2">
                  {data.scenarios.map((sc, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        expectedDiscount === sc.discount_percent
                          ? 'bg-white/[0.08] border-white/20'
                          : 'bg-zinc-950/40 border-white/[0.04]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {sc.discount_percent === 0 ? '0% (Fijo)' : `-${sc.discount_percent}%`}
                          </span>
                          <span className="text-[11px] text-zinc-400">· {sc.description}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {sc.negotiated_savings > 0 ? `Ahorras ${sc.negotiated_savings.toLocaleString()} € negociando` : 'Precio de venta directo'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-white tracking-tight">
                          ≤ {sc.max_listing_price.toLocaleString()} €
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          Ofertar {sc.deed_offer_price.toLocaleString()} €
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

      </div>

      {/* Interactive Simulator: "Pruébalo con un anuncio concreto" */}
      <div className="bg-[#111217] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">Simulador de Piso Concreto</h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Introduce el precio de un piso que hayas visto en Idealista o Fotocasa y comprueba si te encaja.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              isSamplePaymentOk && isSampleCashOk 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isSamplePaymentOk && isSampleCashOk ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Operación Viable
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {!isSamplePaymentOk ? 'Supera cuota bancaria de 490€' : 'Efectivo insuficiente'}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-zinc-400 block font-medium">Precio del anuncio</label>
            <div className="relative">
              <input
                type="number"
                step="5000"
                value={sampleListingPrice}
                onChange={(e) => setSampleListingPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold text-sm outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">€</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 block font-medium">Rebaja negociada</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={sampleDiscountPercent}
                onChange={(e) => setSampleDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold text-sm outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 block font-medium">Precio de oferta final</label>
            <div className="w-full bg-zinc-900/50 border border-white/[0.06] rounded-xl px-3 py-2 text-white font-bold text-sm">
              {sampleOfferPrice.toLocaleString()} €
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 block font-medium">Cuota mensual estimada</label>
            <div className={`w-full border rounded-xl px-3 py-2 font-bold text-sm flex items-center justify-between ${
              isSamplePaymentOk 
                ? 'bg-zinc-900/50 border-white/[0.06] text-white' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <span>{sampleMonthlyPayment.toLocaleString()} €/mes</span>
              <span className="text-[10px] font-normal text-zinc-400">Máx: {sampleMaxAllowedPayment}€</span>
            </div>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-[11px] text-zinc-500 block">ITP 9% CLM</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">{sampleItp.toLocaleString()} €</span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block">Notaría + Registro + Gestoría</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">{(sampleNotaryRegistry + sampleManagement).toLocaleString()} €</span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block">Efectivo total a poner</span>
            <span className="font-bold text-white mt-0.5 block">{sampleCashNeeded.toLocaleString()} €</span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block">Colchón libre que te queda</span>
            <span className={`font-bold mt-0.5 block ${sampleCushionLeft >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {sampleCushionLeft >= 0 ? `+${sampleCushionLeft.toLocaleString()} €` : `${sampleCushionLeft.toLocaleString()} €`}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
