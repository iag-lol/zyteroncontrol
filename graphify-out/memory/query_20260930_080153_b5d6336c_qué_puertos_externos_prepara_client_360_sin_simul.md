---
type: "query"
date: "2026-09-30T08:01:53.552676+00:00"
question: "¿Qué puertos externos prepara Client 360 sin simular integraciones?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["TaxDocumentProvider", "PaymentProvider", "ElectronicSignatureProvider", "clientProviderPorts"]
---

# Q: ¿Qué puertos externos prepara Client 360 sin simular integraciones?

## Answer

client-provider-ports.ts define TaxDocumentProvider, PaymentProvider y ElectronicSignatureProvider como contratos NOT_CONFIGURED; ningún proveedor se simula ni se acopla al agregado Client.

## Outcome

- Signal: useful

## Source Nodes

- TaxDocumentProvider
- PaymentProvider
- ElectronicSignatureProvider
- clientProviderPorts