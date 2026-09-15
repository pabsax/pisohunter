#!/bin/bash

# Script de arranque de PisoHunter Albacete
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Obtener IP local para acceder desde el iPhone en la misma red Wi-Fi
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo "============================================================"
echo "    🏠 PISOHUNTER ALBACETE - Buscador Inteligente de Pisos   "
echo "============================================================"
echo "  • Presupuesto máx: 170.000 €"
echo "  • Ahorros usuario: 65.000 € (Solvencia completa comprobada)"
echo "  • Criterios: 2 personas, casi imprescindible ascensor"
echo "  • ITP Castilla-La Mancha: 9.0%"
echo "  • Zonas vetadas: Las 600, Churruca, Congo (auto-descarte)"
echo "------------------------------------------------------------"
echo "  🖥️  Abrir en este Mac:      http://localhost:8000"
echo "  📱  Abrir en tu iPhone:    http://${LOCAL_IP}:8000"
echo "------------------------------------------------------------"
echo "  💡 Para iPhone: Abre el enlace en Safari, pulsa 'Compartir'"
echo "     y luego 'Añadir a pantalla de inicio' para tener la App."
echo "============================================================"
echo "Iniciando servidor local..."

"$DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000
