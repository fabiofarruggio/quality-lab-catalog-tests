# Política de documentación

[English version](DOCUMENTATION-POLICY.en.md) | **Español (principal)**

Esta política hace que la documentación humana de este repositorio sea **español-first** y también esté disponible en inglés, sin alterar la procedencia de artefactos técnicos o generados.

## Regla de idioma

- Cada documento humano nuevo o modificado se escribe primero en español.
- Cada documento de ese tipo debe tener un compañero en inglés con el mismo nombre base y el sufijo `.en.md`.
- `README.md` y `docs/README.md` son las entradas principales en español; sus compañeros `.en.md` son las entradas completas en inglés.
- Comandos, nombres de API, identificadores, código, rutas, hashes y enlaces oficiales conservan su forma técnica original.

## Límites de traducción

No se traducen ni se reescriben: `AGENTS.md`, el paquete PRD inmutable, evidencia generada, snapshots, logs, reportes, capturas, fixtures sintéticos, material de terceros/vendor, atribuciones y licencias. Estos bytes son parte de la procedencia o contienen instrucciones operativas; el índice debe enlazarlos sin editarlos.

## Checklist de cambios

1. Actualizar el documento en español y su compañero inglés en el mismo cambio.
2. Mantener enlaces relativos válidos y declarar límites o evidencia no ejecutada.
3. Verificar el diff para confirmar que sólo se modificaron documentos autorados, no evidencia, vendor ni archivos de instrucciones.

El índice de documentación está en [`docs/README.md`](README.md) y en su [versión en inglés](README.en.md).