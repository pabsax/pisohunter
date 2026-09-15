# 🏠 PisoHunter Albacete

Aplicación web progresiva (PWA) e inteligente diseñada específicamente para encontrar y comprar piso en **Albacete capital** con un presupuesto máximo de **170.000 €**, adaptado para **2 personas** y con **ascensor casi imprescindible**.

---

## 🚀 Inicio Rápido (1 Clic)

Simplemente ejecuta el script de inicio en la terminal:

```bash
./iniciar_pisohunter.sh
```

El script detectará automáticamente tu conexión y te dará los dos accesos:
- 🖥️ **En tu Mac/PC**: Abre [http://localhost:8000](http://localhost:8000)
- 📱 **En tu iPhone (misma red WiFi)**: Abre `http://<TU-IP-LOCAL>:8000` (el script te indicará la IP exacta).

---

## 📱 Cómo "Instalar" la App en tu iPhone (Pantalla de Inicio)

PisoHunter está configurada como una **Progressive Web App (PWA)** compatible con iOS:

1. Conecta tu iPhone a la **misma red Wi-Fi** que tu Mac.
2. Abre **Safari** en el iPhone y escribe la dirección que te muestra el script (ej: `http://192.168.1.XX:8000`).
3. Toca el botón **Compartir** en la barra inferior de Safari (el cuadrado con la flecha hacia arriba ⬆️).
4. Desplaza hacia abajo en el menú y selecciona **"Añadir a pantalla de inicio"** (icono con el signo ➕).
5. Pulsa **Añadir**.
6. ¡Listo! Se creará el icono de **PisoHunter** en tu pantalla de inicio y se abrirá a pantalla completa sin barras de navegador, como si fuera una app nativa descargada del App Store.

---

## 🎯 Criterios y Motor de Puntuación (Score 0-100)

El sistema evalúa y puntúa cada piso según los parámetros que definiste:

| Bloque | Peso | Criterio aplicado |
| :--- | :--- | :--- |
| **Precio y Valor m²** | **30 pts** | Evalúa el margen por debajo de 170.000 € y compara el precio/m² con la media del barrio en Albacete. |
| **Ascensor (Casi imprescindible)** | **25 pts** | Piso con ascensor = 25 pts. Piso sin ascensor en planta alta = penalización severa (-30 pts). |
| **Habitaciones (2 personas)** | **20 pts** | 2 o 3 habitaciones = máxima puntuación. 1 habitación = aceptable (9 pts). |
| **Plaza de Garaje** | **12 pts** | Incluye garaje = +12 pts (muy valorado en Ensanche, Feria, Centro o Franciscanos). |
| **Estado de Conservación** | **10 pts** | Para entrar a vivir = 10 pts. A reformar = calcula coste estimado de obra (~350 €/m²) y penaliza si excede 170k. |
| **Ubicación y Barrio** | **8 pts** | Albacete capital prioritario. Pueblos cercanos evaluados secundariamente. |
| **Extras y Confort** | **5 pts** | Luz natural (exterior), terraza/balcón, gas natural, aire acondicionado. |

### ⛔ Zonas Vetadas (Blacklist 100%)
Los inmuebles en zonas marginales o conflictivas (**Las 600 / La Milagrosa, El Congo / Churruca**, etc.) reciben **puntuación 0** y son descartados automáticamente.

---

## 💰 Diagnóstico Financiero Real (Castilla-La Mancha)

Con tus **65.000 € de ahorros**:

Para un piso en el tope de **170.000 €**:
- **Entrada hipotecaria estándar (20%)**: 34.000 €
- **ITP Castilla-La Mancha (9%)**: 15.300 €
- **Notaría, Registro de la Propiedad, Gestoría y Tasación**: ~2.500 €
- **Efectivo total necesario**: ~**51.800 €**
- **Colchón libre restante de tus 65k**: ~**+13.200 €** para reformas, muebles o fondo de emergencia.
- **Cuota hipotecaria estimada** (al 2.75% a 30 años): **~550 € / mes** (aprox. **275 € / mes por persona**).

---

## ⚡ Bookmarklet "Guardar con 1-Clic" desde Portales

En la pestaña **Criterios & PWA** tienes el botón para copiar el Bookmarklet.
- Crea un marcador en tu navegador y pega el código.
- Cuando estés navegando por Idealista o Fotocasa y veas un piso que te interese, pulsa el marcador: capturará fotos, precio y detalles y lo guardará puntuado en tu aplicación al instante.

---

## 📋 Hoja de Visita Presencial (Móvil)

Cada piso dispone del botón **"Visita"** que abre una lista de comprobaciones para cuando estés físicamente en el inmueble:
- Evaluación de 1 a 5 de ruido exterior, luz natural y portal.
- Toggles para verificar **humedades en techos/paredes**, presión de agua y cuadro eléctrico.
- Confirmación de derramas de comunidad pendientes y cuota real mensual.
- Veredicto final: *¿Comprarías este piso?*
- Guarda las notas y pasa el piso a estado *Visitado* en el pipeline.
