# aleregex — Full Task List (Layers 2 to 6)

> Lista completa de tareas para aleregex durante el ETHGlobal Open Agents hackathon. Cubre las 5 capas restantes del proyecto ENSFirewall.
>
> **Importante para la AI assistant de aleregex:** aleregex es la persona humana que va a ejecutar estas tareas. Tú (la AI) eres su pair programmer. Lee primero el documento `docs/PROJECT_CONTEXT.md` del repo para entender el proyecto entero antes de empezar cualquier tarea. Si hay ambigüedad técnica, pregunta antes de implementar.

> **Repo:** [github.com/aleregex/ENSFirewall](https://github.com/aleregex/ENSFirewall)
> **Trabajo en paralelo con:** OscarGauss (que se encarga del SDK TypeScript, el agente con Anthropic, y el frontend Next.js)

---

## Contexto rápido

ENSFirewall es un protocolo donde:
1. Publishers escriben policies de seguridad como text records en ENS
2. Agent owners suscriben sus agentes a esas policies
3. Una smart account ERC-4337 lee ENS antes de firmar y rechaza transacciones que violan policies
4. Si un agente es atacado, el dueño puede publicar el atacante a una lista comunitaria, todos los agentes suscritos quedan protegidos automáticamente

**Lo que aleregex construye:** todos los smart contracts (`ENSFirewallAccount`, `PolicyValidator`), los scripts de Foundry para deploys y publicación de policies en Sepolia, todo el flow de ENS (subnames, text records, NameWrapper, resolver), y el setup de Sepolia (RPC, wallet, ENS name del proyecto).

**Lo que aleregex NO toca:** el SDK TypeScript, el agente con Anthropic, el frontend Next.js, el demo de 3 paneles. Eso es de OscarGauss.

**Punto de coordinación:** `packages/shared/`. Las constantes de ENS keys y el formato de ABI encoding las define aleregex (porque el contrato Solidity es quien las lee onchain). Los tipos de TypeScript y los validators offchain los define OscarGauss. Cualquier cambio en `shared/` se avisa antes.

**Background relevante:** aleregex tiene experiencia previa con ENS por el proyecto growi-ens. Los helpers de `lib/ens/*` y `lib/chain/*` que se reutilizan en este proyecto son código que escribió aleregex. Esto está disclosed en el README.

---

## Layer 2 — ENS conectado al contrato

| # | Tarea | Logro |
|---|---|---|
| A1 | Limpiar archivos legacy de Foundry (`Counter.sol`, `Counter.s.sol`) | Repo limpio, solo código del proyecto |
| A2 | Comprar `ensfirewall.eth` en Sepolia + crear wallet hackathon dedicada | Identidad ENS del proyecto registrada, wallet separada de fondos personales |
| A3 | Definir ENS keys en `packages/shared/src/ens-keys.ts` | Constantes compartidas listas, **desbloquea a OscarGauss** para G1, G2 |
| A4 | Portar `lib/ens/*` y `lib/chain/*` de growi-ens al monorepo | Helpers de ENS read/write listos en `packages/lib/`, **desbloquea a OscarGauss** para G3-G5 |
| A5 | Crear `PolicyValidator.sol` (library con `validateBlocklist`) | Lógica de validación reutilizable entre el smart account y futuros validators |
| A6 | Refactorizar `ENSFirewallAccount.sol` para leer ENS en vez de storage local | Smart account ya no tiene blocklist hardcodeada, hace ENS resolver call onchain |
| A7 | Script Foundry `PublishPolicy.s.sol` para publicar text record en Sepolia | `scamlist.ensfirewall.eth` con blocklist real publicada |
| A8 | Script Foundry `DeployAndSubscribe.s.sol` para deployar smart account y suscribirlo | Smart account vivo en Sepolia, suscrito a la blocklist |
| A9 | Test E2E manual en Sepolia: cambiar text record → comportamiento cambia sin redeploy | **Tesis del proyecto probada.** Documentar resultados con tx hashes en `docs/E2E_RESULTS.md` |

---

## Layer 3 — Soporte de bundler + integración con SDK

| # | Tarea | Logro |
|---|---|---|
| A10 | Configurar Pimlico bundler en Sepolia (verificar EntryPoint correcto, free tier) | Smart account puede recibir userOps de un bundler real, no solo calls directos |
| A11 | Agregar override de `_validateUserOp` si es necesario para ENS reads (decidir entre validar en `execute()` vs `_validateUserOp`) | Decisión técnica de Layer 2 confirmada o ajustada con experiencia real |
| A12 | Coordinar con OscarGauss el test de integración SDK ↔ contrato en Sepolia | Verificar que el agente de OscarGauss puede mandar userOps que el smart account valida correctamente |
| A13 | Implementar paymaster opcional (si Pimlico lo soporta gratis) | Smart account no necesita ETH propio para gas, mejor UX para el demo |
| A14 | Documentar el flow completo agent→SDK→bundler→contrato en `docs/ARCHITECTURE.md` | Otros developers (y jueces) pueden entender la arquitectura sin leer todo el código |

---

## Layer 4 — Más policies en Solidity

| # | Tarea | Logro |
|---|---|---|
| A15 | Agregar `validateLimits(bytes encoded, uint256 value, uint256 dailySpent)` al `PolicyValidator.sol` | Soporta `max_per_tx_usd` y `max_per_day_usd` onchain |
| A16 | Agregar daily counter en storage del `ENSFirewallAccount.sol` con reset por timestamp | Tracking de gasto diario para enforcement de limits |
| A17 | Soporte para múltiples autoridades en `policy:subscriptions` (parsear lista separada por coma) | Smart account puede suscribirse a varias listas a la vez, no solo una |
| A18 | Crear segundo subname `limits.ensfirewall.eth` con policy de límites publicada | Lista de límites lista para que agentes se suscriban |
| A19 | Tests Foundry con mock de ENS para los nuevos casos (limits + multi-authority) | Confianza de que limits funciona antes de probarlo en Sepolia |
| A20 | Test E2E con limits en Sepolia | Limits funcionando con ENS real, documentar en `docs/E2E_RESULTS.md` |

---

## Layer 5 — Network effect + deploy público + segundo agente

| # | Tarea | Logro |
|---|---|---|
| A21 | Crear subname `community-reports.ensfirewall.eth` en Sepolia | Lista comunitaria lista para recibir reportes desde el frontend |
| A22 | Deployar segundo `ENSFirewallAccount` (`agent2.ensfirewall.eth`) suscrito a community list | Segundo agente listo para demostrar el network effect |
| A23 | Script `ReportAddress.s.sol` que escribe a community list (también puede ser una función llamable desde el SDK) | Mecanismo de publicar nuevos atacantes funcionando onchain |
| A24 | Test E2E del network effect en Sepolia: reporte en agente 1 → agente 2 bloquea instantáneamente | **Demo wow probado:** propagación instantánea sin redeploy. Documentar en `docs/E2E_RESULTS.md` |
| A25 | Mantener saldo en las wallets de los smart accounts del demo (Sepolia ETH) | Demo público no se queda sin ETH a las 3am, configurar alerta o auto-refill desde faucet |
| A26 | Verificar contratos en SepoliaScan (smart accounts, PolicyValidator) | Jueces pueden ver el código y la verificación, suma credibilidad |

---

## Layer 6 — Polish, docs, submission

| # | Tarea | Logro |
|---|---|---|
| A27 | README final del repo con arquitectura, setup, decisiones de diseño, future work, link al demo | Repo presentable, jueces que clonen lo entienden en 5 min |
| A28 | Documentar todas las direcciones de contratos deployados en Sepolia con links a SepoliaScan en `docs/DEPLOYMENTS.md` | Verificable y auditable por jueces |
| A29 | Sección "Reused code" en README declarando lo que viene de growi-ens | Transparencia ante jueces, evita acusaciones de plagio |
| A30 | Diagrama de arquitectura limpio (Excalidraw o tldraw, exportado como SVG/PNG) | Visual que va al video y al README |
| A31 | Aparecer en el video grabando los 5 ataques en vivo en Sepolia (coordinar con OscarGauss el guión) | Demo wow capturado para submission |
| A32 | Revisar form de submission de ETHGlobal antes de enviar (descripción, how it's made, partners ENS seleccionados correctamente) | Submission limpia sin errores de form |

---

## Resumen

| Layer | Tareas | Foco |
|---|---|---|
| Layer 2 | A1-A9 | ENS conectado al contrato + tesis probada |
| Layer 3 | A10-A14 | Bundler + integración con SDK |
| Layer 4 | A15-A20 | Limits onchain + multi-authority |
| Layer 5 | A21-A26 | Network effect + segundo agente + deploy público |
| Layer 6 | A27-A32 | Docs + diagrama + submission |

**Total tareas:** 32 distribuidas en 5 capas
**Tiempo total estimado:** 35-50 horas de trabajo
**Trabajo paralelo:** OscarGauss hace 42 tareas (SDK + agente + frontend) en paralelo

---

## Reglas de coordinación con OscarGauss

### Ownership claro

- **aleregex owns:** `packages/contracts/`, todo lo onchain, deploys a Sepolia, ENS setup, scripts de Foundry, partes de Solidity-related de `packages/shared/`
- **OscarGauss owns:** `packages/lib/`, `packages/agent/`, `packages/web/`, partes de TypeScript de `packages/shared/`

### Punto crítico de coordinación: encoding

La tarea A5 (`PolicyValidator.sol`) es donde más fácil se rompe la integración. El formato debe matchear exacto el que OscarGauss usa con viem (tarea G2).

**Antes de implementar A5:** confirmar con OscarGauss el formato. La especificación es:
- En Solidity: `abi.decode(encoded, (address[]))`
- En viem: `encodeAbiParameters([{ type: 'address[]' }], [addresses])`
- Round-trip debe ser perfecto: lo que viem encoda, Solidity decoda igual.

Hacer un test cruzado: OscarGauss encoda con viem, le pasa el hex a aleregex, aleregex lo decoda en Foundry, y verifican que devuelve el mismo array.

### Wallet del hackathon (compartida)

aleregex crea la wallet (`cast wallet new` en A2) y comparte la private key con OscarGauss vía password manager (1Password, Bitwarden, Signal). **Nunca compartir vía Discord/Telegram en texto plano. Nunca commitear.**

Esta wallet:
- Registra `ensfirewall.eth`
- Deploya los contratos
- Es owner de los smart accounts
- Escribe los text records iniciales

**No es la wallet personal de nadie.** Solo se usa para el hackathon. Cero fondos reales.

### Branches y commits

- Branches: `aleregex/contracts-*`, `aleregex/ens-*`, `aleregex/scripts-*`
- Commits: `feat(contracts):`, `feat(shared):`, `chore(contracts):`, `test(e2e):` según el package y la naturaleza del cambio
- PRs a main con review ligera de OscarGauss

### Comunicación

- Daily check-in corto: qué hizo ayer, qué hará hoy, qué blockers
- Si hay duda sobre arquitectura, preguntar antes de implementar
- Si vas a tocar `packages/shared/`, avisar primero
- Si una tarea de Sepolia tarda más de lo esperado (típico con ENS y NameWrapper), avisar para ajustar tiempos

---

## Decisiones técnicas ya tomadas

1. **Smart account first, ENS second.** Layer 1 usó blocklist hardcodeada para validar el stack ERC-4337 antes de depender de ENS. Layer 2 lo cambia.

2. **Validar en `execute()`, no en `_validateUserOp()` (al menos por ahora).** ERC-4337 tiene reglas estrictas sobre qué puede hacer `_validateUserOp` (no leer storage externo sin paymaster). Por ahora policy logic va en `execute()`. Reconsiderar en Layer 3 con experiencia real del bundler.

3. **Dos text records por policy list:** `policy:rules` (JSON legible para tooling) y `policy:rules-encoded` (ABI-encoded bytes para lectura barata onchain). El contrato lee el encoded.

4. **Lectura onchain pura.** El smart account hace el ENS resolver call directo, sin oracle. Más caro de gas (~80-150k extra) pero el pitch se vende solo: "the wallet reads ENS before signing, no trusted intermediary."

5. **Reused code de growi-ens.** Helpers de ENS read/write y chain client setup vienen de un proyecto previo. Disclosed en el README. Smart account, validation logic, scripts de Foundry, agent integration, network effect, y demo UI son todos nuevos.

6. **Sepolia only.** Sin mainnet, sin L2, sin multichain. Multichain es future-work bullet.

7. **Solidity 0.8.28** pinned por la dependencia eth-infinitism/account-abstraction. No cambiar a versión más nueva sin verificar compatibilidad.

8. **Foundry, no Hardhat.** Tests en Solidity son más rápidos y el hackathon valora velocidad.

---

## Direcciones importantes (verificar antes de usar)

Las siguientes direcciones se asumen para Sepolia. **Verificar contra la fuente oficial antes de usar en scripts** ([docs.ens.domains/learn/deployments](https://docs.ens.domains/learn/deployments) y [docs.pimlico.io](https://docs.pimlico.io)):

- ENS Registry (Sepolia): por verificar
- NameWrapper (Sepolia): por verificar
- Public Resolver (Sepolia): por verificar
- EntryPoint v0.7 (Sepolia): por verificar (suele ser el mismo en mainnet y testnets)
- Pimlico bundler endpoint Sepolia: por verificar

Cuando se confirmen, agregar al `.env.example` y mencionar en `docs/DEPLOYMENTS.md`.

---

## Tareas NO incluidas (out of scope)

Para que esté claro qué NO se construye:

- Custom registry contracts (usar ENS as-is)
- Backend con database
- Tokens, payment systems, marketplaces
- Auto-publishing de signals (humanos publican, opt-in)
- Mainnet deploys
- Multichain
- Verificación formal de contratos (auditoría real)
- Optimización agresiva de gas (V2 path)

---

## Si te trabas como AI assistant de aleregex

- **Lee primero `docs/PROJECT_CONTEXT.md`** del repo. Tiene el contexto completo del proyecto, las decisiones técnicas, y el flujo end-to-end.
- **Si una tarea depende del trabajo de OscarGauss** (típicamente algo en `packages/shared/` que él ya tocó), avisar a aleregex para coordinar antes de empezar.
- **No inventes direcciones de contratos** de Sepolia. Verificar siempre contra fuente oficial. Direcciones inventadas hacen perder horas en debug.
- **No inventes nombres de funciones de SimpleAccount, EntryPoint, NameWrapper, o PublicResolver.** Las APIs cambian entre versiones. Leer el código real en `lib/account-abstraction/contracts/` o en docs oficiales antes de asumir.
- **Para tareas de TypeScript-adjacent** (entender qué tipos espera el SDK, cómo viem encoda algo): leer `packages/lib/` o `packages/shared/` directamente. No asumir.
- **Si una decisión técnica no está cubierta arriba**, asumir el camino más simple y conservador, y preguntar a aleregex antes de hacer algo grande.
- **Cuando una transacción de Sepolia revierte sin razón clara**: usar `cast call` (simula sin gastar gas) o `cast run <tx_hash>` para ver el error exacto antes de seguir intentando.

---

## Hackathon principle

This is a hackathon. Bias hacia **shipping working code over architectural perfection.** Si funciona y pasa tests, mergea. Refactor en Layer 6 si hay tiempo. Cada capa es un entregable defendible por sí solo.

El win condition no es "best engineered project". Es **"best demo que los jueces recuerden después de ver 50 otros."** Optimizar para el demo. Los contratos deben ser limpios porque son auditables. El E2E test debe funcionar perfecto en vivo porque es lo que sostiene la tesis del proyecto.
