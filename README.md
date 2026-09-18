# Regresión de referencia de Catalog

**Idioma / Language:** Español (principal) · [English](README.en.md)

`TASK-020` / `REQ-TEST-001`: **21 checks HTTP reales y cuatro checks de navegador real** para el squad explícitamente simulado de Catalog. Este consumer fue generado fuera del repositorio de template e instala la biblioteca común de fixtures desde su tarball local versionado y con hash registrado.

## Reproducir

Use Node **24.21.0**, npm **11.19.0** y el repositorio hermano `quality-lab-app`. Primero instale y construya las dependencias fijadas de esa aplicación siguiendo su README. Luego, desde este repositorio:

```powershell
npm ci --ignore-scripts
npm run typecheck
npm run test:api
```

Para los checks de navegador, ejecute `npm run browser:install` para instalar Chromium en la caché local `node_modules/.cache/ms-playwright`, o seleccione explícitamente un canal Chrome/Edge instalado y soportado por Playwright. La ejecución observada en Windows usó:

```powershell
$env:AQP_BROWSER_CHANNEL = 'chrome'
npm run verify:local
```

`verify:local` exige inputs versionados de suite y aplicación, sin cambios de bytes, antes de ejecutar. Repite instalación limpia, lint, typecheck y checks de binding, copia los blobs exactos de la aplicación comprometidos a `.verification-work/<run-id>/app`, instala/construye esa copia aislada, descubre la suite completa y ejecuta las pruebas. Nunca reconstruye ni confía en un `dist` mutable del repositorio hermano. Ambos repositorios deben permanecer estables durante la corrida.

El registro de ejecución vincula reportes y discovery por SHA-256, run ID y hora, además de hashes antes/después de fuente comprometida, dependencias instaladas y runtime preparado. Logs, reportes y una captura real se guardan localmente en un `evidence/<UTC-run-id>/` nuevo; esos recibos quedan en el respaldo privado del workspace y no se publican. El staging se conserva localmente para checks de admisión y nunca se commitea. El fixture inicia un proceso HTTP separado y un store en memoria nuevo **para cada test**, usa cuentas sintéticas y termina cada hijo en teardown.

## Qué demuestran los checks

### Perfil PostgreSQL aislado (integración pendiente)

`playwright.sandbox.config.ts` selecciona un fixture separado `isolated_postgres` en `127.0.0.1:3000`. Sólo el runner de laboratorio confiable puede proporcionar `AQP_EXPECTED_APP_COMMIT` y aprovisionar los contenedores efímeros de base de datos/aplicación/navegador. Este perfil requiere el sandbox de Chromium, desactiva retries y conserva los 25 IDs de referencia y sus aserciones de negocio. Las dos aserciones de identidad de ambiente distinguen explícitamente PostgreSQL del test double de memoria predeterminado.

El perfil no aprovisiona Docker, expone credenciales de base de datos ni atestigua una imagen por sí mismo. Su fuente pasó lint, typecheck y 30 tests de binding de evidencia antes del commit; la corrida completa de 25 variantes con PostgreSQL aislado sigue pendiente. No reutilices el snapshot histórico del store de memoria como evidencia para este perfil o revisión de fuente. Rollback se limita a esta configuración, su rama de fixture, dos aserciones de identidad y el input de hash agregado.

Incluye autenticación y autorización, valores seed, precios enteros positivos, incrementos de versión, umbrales de descuento 9999/10000/10001, límites/cantidades negativas, artículos inactivos, quotes obsoletas, rechazo del total del cliente, confirmación idempotente y journeys de UI correspondientes. La biblioteca compartida `@aqp/qa-framework-template` permanece instalada como código; no se copia un fork de fixtures.

`catalog/business-contract.json` define criterios originales de laboratorio. `catalog/test-definitions.json` mapea IDs observados del runner a esos criterios. No es un `ExecutionEvidence` ni un catálogo TMS remoto. Luego de commitear la fuente, se puede crear un `TestCatalog` válido sin inventar un commit:

```powershell
node scripts/catalog.mjs definitions evidence/<run-id>/playwright-results.json
node scripts/catalog.mjs snapshot evidence/<run-id>/playwright-results.json
```

Ambos comandos requieren el registro de ejecución adyacente versión 2. La admisión del snapshot vuelve a comprobar todos los bytes relevantes de fuente/configuración/fixture/lock/manifest/business-contract contra sus blobs Git registrados y contra runtime/dependencias preparados y retenidos. Discovery vacío, variantes faltantes, retries, skips, reportes stale/mutados, escapes de path y drift de inputs fallan cerrado.

El `TestCatalog` siempre nombra el **commit de ejecución registrado**, nunca un HEAD posterior. Un commit posterior sólo documental puede ser byte-equivalente; esa equivalencia se registra explícitamente en `catalog/test-catalog-binding.json`. Los hashes establecen consistencia, no una atestación firmada de ejecución confiable. Realice el commit de este fix de fuente antes de la primera nueva corrida de verificación de 25 tests.

## Límites honestos

- El perfil de producto es `offline_replay`; la ejecución de tests sí es comportamiento HTTP/browser local real, no replay de respuestas grabadas. No se invocó razonamiento de modelo ni inferencia por API.
- El storage es explícitamente `isolated_test_double`. **No están establecidos PostgreSQL, Docker/sandbox sin secretos ni identidad verificada de imagen.** Pasar estos tests no cierra esas condiciones del gate M1.
- La descarga de Chromium 153.0.8010.12 falló por timeouts de red. La evidencia de UI usó Chrome 153.0.8010.36 instalado y un perfil nuevo controlado por Playwright; no se reutilizó el browser personal. Es una desviación registrada de la reproducibilidad con browser bundled, no un retry oculto exitoso.
- El launcher reenvía una allowlist de entorno, no credenciales SaaS/modelo. Eso no es sandboxing de filesystem ni del sistema operativo. Son tests de referencia autorados por mantenimiento, no código generado por agentes de producto.
- QLAB y los nombres de repositorios son identidades lógicas planificadas; no se afirman recursos Jira/GitHub/Vansah existentes. SaaS y CI remoto siguen sin ejecutarse y requieren autorización.
- `.github/workflows/verify.yml` es preparación manual-only. Requiere un repositorio de aplicación autorizado y commit exacto, y actualmente ejecuta sólo la referencia HTTP/store de memoria; no es un release gate ni una prueba de PostgreSQL.
- Las credenciales sintéticas de login son datos públicos de demostración intencionales, no autenticación de producción.

## Rollback

Esta unidad comprende configuración del consumer, archivo versionado de la biblioteca, fixtures, tests, definiciones de catálogo, preparación de CI y verificación local. Los recibos generados se conservan en el respaldo privado del workspace. Se puede retirar sin modificar el PRD inmutable, el repositorio de aplicación ni recursos remotos. Conserve `AGENTS.md` y los archivos de bootstrap del repositorio.

## Política de documentación

Este `README.md` es la entrada principal en español. La versión completa en inglés está en [`README.en.md`](README.en.md). `TEMPLATE_USAGE.md` también es español-first y tiene su companion [`TEMPLATE_USAGE.en.md`](TEMPLATE_USAGE.en.md). `AGENTS.md` y los recibos históricos de verificación conservan su idioma y bytes originales en el respaldo privado para proteger instrucciones y procedencia; los documentos de terceros/vendor no se traducen.

## Licencia

El código original está bajo la Licencia MIT en [LICENSE](LICENSE). Las dependencias y materiales de terceros autorados conservan sus licencias respectivas.
