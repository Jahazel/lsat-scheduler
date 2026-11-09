# A card starts the free week

Status: accepted (owner, 2026-11-09). Replaces the "no card needed" free week and the plan choice at the end of the free week from the 2026-11-02 landing page decisions (#519).

A new student picks Weekly or Monthly and adds a card on Stripe Checkout as the last onboarding step. The plan starts with the free week as a Stripe free trial, and the first charge comes on the Monday after the free week. The owner chose this over a no-card free week: fewer people may sign up, but the ones who do have already agreed to pay, and a card on file makes repeat free weeks harder.

The free week now has a fixed end date: the Sunday that closes the student's first full Monday–Sunday week after onboarding. Stripe needs that date when the card is added, so the free week can no longer start at the first weekly upload.

## Consequences

- The landing page drops "No card needed". Its note becomes "Your first full week free. Cancel before it ends and pay nothing."
- California's auto-renewal law covers free trials that turn into paid plans. Plan choice must show the renewal terms clearly, and the student must agree to them. #582 holds the lawyer question.
- A "Plan next week" weekly upload on the free week's last weekend saves a held weekly schedule. This week shows it only after the first charge succeeds. If the first charge fails, the student is lapsed at once; the 7-day retry access applies only to later renewals.
