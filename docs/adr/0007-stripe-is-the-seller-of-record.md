# Stripe is the seller of record for plans

Status: accepted (owner, 2026-11-08), if the owner's Stripe account can turn on Managed Payments.

DrillMap sells plans through Stripe Managed Payments. With Managed Payments, Stripe is the merchant of record: Stripe is the legal seller, so it collects and files sales tax for each state. The owner runs DrillMap alone and cannot track and file sales tax in many states. Managed Payments costs an extra fee on each payment, and the owner accepts that fee to avoid the tax work.

Students pay on Stripe Checkout, and they change their card or cancel on the Stripe Customer Portal. Both are pages that Stripe hosts. No card number reaches DrillMap, so DrillMap stays out of most card-industry (PCI) security rules.

## Considered Options

- **Plain Stripe Billing, with Stripe Tax.** DrillMap is the seller. Stripe calculates the tax, but the owner registers and files in each state. We use this option only if the account cannot get Managed Payments.
- **A card form inside DrillMap.** This was rejected because card numbers would pass through DrillMap's server.
