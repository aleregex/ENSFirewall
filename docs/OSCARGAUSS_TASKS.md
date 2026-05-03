# OscarGauss — Full Task List (Layers 2 to 6)

> Lista completa de tareas para OscarGauss durante el ETHGlobal Open Agents hackathon. Cubre las 5 capas restantes del proyecto ENSFirewall.
>
> **Importante para la AI assistant de Gauss:** OscarGauss es la persona humana que va a ejecutar estas tareas. Tú (la AI) eres su pair programmer. Lee primero el documento `docs/PROJECT_CONTEXT.md` del repo para entender el proyecto entero antes de empezar cualquier tarea. Si hay ambigüedad técnica, pregunta antes de implementar.

> **Repo:** [github.com/aleregex/ENSFirewall](https://github.com/aleregex/ENSFirewall)
> **Trabajo en paralelo con:** aleregex (que se encarga de contracts, ENS y deploys onchain)

---

## Contexto rápido

ENSFirewall es un protocolo donde:
1. Publishers escriben policies de seguridad como text records en ENS
2. Agent owners suscriben sus agentes a esas policies
3. Una smart account ERC-4337 lee ENS antes de firmar y rechaza transacciones que violan policies
4. Si un agente es atacado, el dueño puede publicar el atacante a una lista comunitaria, todos los agentes suscritos quedan protegidos automáticamente

**Lo que OscarGauss construye:** el SDK TypeScript (`ens-agent-firewall`), el agente reference con Anthropic SDK, y el frontend Next.js (incluyendo el demo de 3 paneles que se ve en el video).

**Lo que OscarGauss NO toca:** Solidity, contratos, scripts de Foundry, deploys a Sepolia, configuración de ENS. Eso es de aleregex.

**Punto de coordinación:** `packages/shared/`. Los tipos de TypeScript los define OscarGauss, las constantes de ENS keys y el formato de encoding las define aleregex. Cualquier cambio en `shared/` se avisa antes.

---

## Layer 2 — SDK base + integración con ENS

| # | Tarea | Logro |
|---|---|---|
| G1 | Definir policy types en `packages/shared/src/policy-schema.ts` | Tipos TypeScript listos para `BlocklistRules`, `LimitsRules`, `PatternsRules`, `PolicyList` con discriminated union |
| G2 | Implementar `encodeBlocklist` y `decodeBlocklist` en `packages/shared/src/encoding.ts` | Funciones de ABI encoding/decoding usando viem, formato debe matchear exacto el que aleregex usa en Solidity |
| G3 | Setup de `packages/lib/` (package.json, tsup config, tsconfig, README) | SDK `ens-agent-firewall` con build funcionando |
| G4 | Implementar `getPolicyList(authorityEns)` en el SDK | Función que lee `policy:rules-encoded` de un ENS y devuelve la lista decodificada |
| G5 | Implementar `getSubscriptions(agentEns)` en el SDK | Función que lee `policy:subscriptions` de un ENS y devuelve array de autoridades |
| G6 | Implementar `validateBlocklist(call, blocklist)` offchain en el SDK | Validador puro con `{ valid, reason? }` |
| G7 | Implementar `buildSafeUserOp(args)` en el SDK | Orquestador: lee subscriptions, lee policies, valida local, construye userOp si pasa |
| G8 | Setup de `packages/agent/` con CLI demo usando Anthropic SDK | Reference agent funcionando en terminal: el LLM decide transferir, el SDK valida, se manda al smart account |
| G9 | Test integrado SDK ↔ contrato de aleregex en Sepolia | Demo CLI: agente intenta transferencia bloqueada, SDK la rechaza, contrato también la rechazaría como defense in depth |

---

## Layer 3 — SDK pulido + agente robusto

| # | Tarea | Logro |
|---|---|---|
| G10 | Configurar Pimlico bundler en el SDK usando permissionless.js | El SDK puede mandar userOps al bundler y recibir confirmación |
| G11 | Implementar manejo de errores `PolicyViolation` con detalles (qué autoridad, qué regla, por qué) | Los rejects son explicables al usuario, no errores genéricos |
| G12 | Agregar logger configurable al SDK | Debug visible cuando se necesita, silencioso en producción |
| G13 | Tests unitarios del SDK con vitest (coverage de getPolicyList, getSubscriptions, validateBlocklist, buildSafeUserOp) | Confianza de que cambios futuros no rompen funcionalidad |
| G14 | Refactorizar el agente para soportar conversación multi-turn (no solo un mensaje) | Agente más realista, mantiene contexto entre mensajes del usuario |
| G15 | Agregar al agente un tool `getBalance` además de `sendTransaction` | El LLM puede consultar saldo antes de decidir, demos más interesantes |
| G16 | Documentar el SDK con un README claro en `packages/lib/` con ejemplo de 5 líneas | Developers que clonen el repo entienden cómo integrarlo |

---

## Layer 4 — Limits + patterns + Web UI inicial

| # | Tarea | Logro |
|---|---|---|
| G17 | Implementar `validateLimits(call, limits, dailySpent)` offchain en el SDK | Validador de límites max_per_tx y max_per_day funcionando |
| G18 | Implementar `validatePatterns(userMessage, patterns)` offchain en el SDK | Validador de prompt injection patterns funcionando |
| G19 | Extender `buildSafeUserOp` para correr los 3 validators (blocklist, limits, patterns) | SDK soporta los 3 tipos de policy del MVP |
| G20 | Setup de `packages/web/` con Next.js 16 + Tailwind + viem + wagmi | Frontend base con wallet connect funcionando |
| G21 | Página `/dashboard` para agent owners | UI para ver subscriptions del agente, agregar/quitar autoridades, escribe text record `policy:subscriptions` |
| G22 | Página `/publish` para publishers | UI para crear nueva policy list, escribe text records `policy:rules` y `policy:rules-encoded` |
| G23 | Página `/lists` que browseta todas las policies conocidas con su reputación | Discovery layer para que la gente vea qué listas existen |

---

## Layer 5 — Demo de 3 paneles + network effect + deploy público

| # | Tarea | Logro |
|---|---|---|
| G24 | Página `/live` con layout de 3 paneles (chat, ENS state, blockchain feed) | Estructura visual del demo lista |
| G25 | Implementar el panel izquierdo (chat con el agente, mensajes en streaming, input público) | Cualquiera puede atacar el agente desde el browser |
| G26 | Implementar los 2 botones pre-cargados de ataques ("Try prompt injection" y "Try normal request") | Baja la fricción para jueces que prueban el demo |
| G27 | Implementar el panel central de ENS state con animaciones (Framer Motion) | Visualización del flow de ENS reads + rule evaluation, **el wow visual del demo** |
| G28 | Implementar el panel derecho de blockchain feed (last 10 userOps con status) | Etherscan-like en vivo, prueba de que las transacciones reales pasan/fallan |
| G29 | Implementar la lógica del network effect: detectar ataque exitoso, mostrar botón "Report this address" | Mecanismo del feedback loop visible en UI |
| G30 | Mostrar el segundo agente en una mini-ventana de la página `/live` | Network effect demostrable: el segundo agente recibe protección sin redeploy |
| G31 | Conectar la lógica de "Report" para que escriba a `community-reports.ensfirewall.eth` vía SDK | El demo wow funcionando end-to-end |
| G32 | Deploy del frontend en Vercel con dominio (vercel.app o ensfirewall.xyz) | URL pública estable que se puede compartir en el video y submission |
| G33 | Configurar el agente backend (Anthropic SDK + smart account) corriendo 24/7 en VPS o Vercel Functions | Demo público vivo, no se cae cuando el laptop de aleregex se duerme |

---

## Layer 6 — Pulido + npm publish + video + submit

| # | Tarea | Logro |
|---|---|---|
| G34 | Pulir todas las animaciones del panel central (timing, colores, transiciones) | Demo se ve hermoso en el video, no amateur |
| G35 | Crear landing page (`/` o `/about`) con el pitch del proyecto | Primera impresión sólida si jueces entran al dominio raíz |
| G36 | Configurar el SDK para `npm publish` (dual ESM/CJS, types, README, exports) | Paquete listo para publicar |
| G37 | Test del paquete publicado en directorio limpio (`npm install ens-agent-firewall && node test.js`) | Validar que el publish funcionó antes de mencionarlo en el video |
| G38 | Publicar a npm como `ens-agent-firewall` | Paquete vivo en npmjs.com, link verificable |
| G39 | Grabar el video de 3 minutos siguiendo el guión (5 escenas) | Submission video listo |
| G40 | Editar el video (cortes, música ambiental sutil, narración pulida) | Video presentable, sin tropezones |
| G41 | Subir video a YouTube (unlisted) | Link disponible para el form de submission |
| G42 | Llenar el form de submission de ETHGlobal (descripción, how it's made, repo, video, demo URL, partners ENS) | Proyecto entregado al hackathon |

---

## Resumen

| Layer | Tareas | Foco |
|---|---|---|
| Layer 2 | G1-G9 | SDK base + agente CLI |
| Layer 3 | G10-G16 | Bundler + agente robusto + tests |
| Layer 4 | G17-G23 | Limits + patterns + Web UI inicial |
| Layer 5 | G24-G33 | Demo 3 paneles + network effect + deploy público |
| Layer 6 | G34-G42 | Pulido + npm publish + video + submit |

**Total tareas:** 42 distribuidas en 5 capas
**Tiempo total estimado:** 50-70 horas de trabajo
**Trabajo paralelo:** aleregex hace 30 tareas (contracts + ENS + onchain) en paralelo

---

## Reglas de coordinación con aleregex

### Ownership claro

- **OscarGauss owns:** `packages/lib/`, `packages/agent/`, `packages/web/`, partes de TypeScript de `packages/shared/`
- **aleregex owns:** `packages/contracts/`, todo lo onchain, partes de Solidity-related de `packages/shared/`

### Punto crítico de coordinación: encoding

La tarea G2 (`encodeBlocklist`/`decodeBlocklist`) es donde más fácil se rompe la integración. El formato debe matchear exacto el que aleregex usa en `PolicyValidator.sol` (tarea A5 de aleregex).

**Antes de implementar G2:** confirmar con aleregex el formato. La especificación es:
- Encoding: `encodeAbiParameters([{ type: 'address[]' }], [addresses])`
- El smart account de Solidity hace: `abi.decode(encoded, (address[]))`
- Round-trip debe ser perfecto: lo que viem encoda, Solidity decoda igual.

Hacer un test cruzado: OscarGauss encoda con viem, le pasa el hex a aleregex, aleregex lo decoda en Foundry, y verifican que devuelve el mismo array.

### Branches y commits

- Branches: `gauss/sdk-*`, `gauss/agent-*`, `gauss/web-*`
- Commits: `feat(lib):`, `feat(agent):`, `feat(web):`, `feat(shared):` según el package
- PRs a main con review ligera de aleregex

### Comunicación

- Daily check-in corto: qué hizo ayer, qué hará hoy, qué blockers
- Si hay duda sobre arquitectura, preguntar antes de implementar
- Si vas a tocar `packages/shared/`, avisar primero

---

## Decisiones técnicas ya tomadas

1. **El SDK valida offchain primero** (rapidez, feedback al LLM) y el contrato re-valida onchain (defense in depth). Los dos validators deben dar el mismo resultado para inputs iguales.

2. **El agente usa Anthropic SDK con tool calling**, no LangChain ni otros frameworks. Menos abstracción, más control.

3. **El frontend es Next.js 16 con app router.** No Pages Router.

4. **viem + wagmi** para todo lo de blockchain en el frontend. No ethers.

5. **Tailwind para todo el styling.** No CSS modules, no styled-components.

6. **Framer Motion para todas las animaciones del panel central.** Las animaciones son 60% del wow del demo, no usar transiciones CSS básicas.

7. **El agente backend corre 24/7** en VPS o Vercel Functions. No corre solo cuando alguien abre la página.

8. **El SDK se publica como `ens-agent-firewall` a npm.** Verificar primero que el nombre esté libre en npmjs.com antes de invertir tiempo en setup de publish.

---

## Tareas NO incluidas (out of scope)

Para que esté claro qué NO se construye:

- Backend con database (todo el estado vive en ENS o onchain)
- User auth más allá de wallet connect
- Mobile app nativa (web only)
- Multichain (Sepolia only)
- Sistemas de tokens, payments, marketplaces
- Auto-publishing de signals (humanos publican, opt-in)
- On-chain forensics (delegamos a autoridades vía subscription)

---

## Si te trabas como AI assistant de OscarGauss

- **Lee primero `docs/PROJECT_CONTEXT.md`** del repo. Tiene el contexto completo del proyecto, las decisiones técnicas, y el flujo end-to-end.
- **Si una tarea depende de algo que aleregex aún no terminó** (típicamente A3 o A4), avisar a OscarGauss para que coordine antes de empezar.
- **No inventes nombres de funciones, types, o ENS keys.** Si necesitas algo de `packages/shared/` o de los contratos, lee el código real primero.
- **Para tareas de Solidity-adjacent** (entender cómo el contrato decoda el blob, qué eventos emite, qué errores devuelve): leer `packages/contracts/src/` directamente. No asumir.
- **Si una decisión técnica no está cubierta arriba**, asumir el camino más simple y conservador, y preguntar a OscarGauss antes de hacer algo grande.

---

## Hackathon principle

This is a hackathon. Bias hacia **shipping working code over architectural perfection.** Si funciona y pasa tests, mergea. Refactor en Layer 6 si hay tiempo. Cada capa es un entregable defendible por sí solo.

El win condition no es "best engineered project". Es **"best demo que los jueces recuerden después de ver 50 otros."** Optimizar para el demo. El SDK debe ser bonito porque hay un snippet de 5 segundos en el video. El frontend debe ser hermoso porque es lo que los jueces ven.
