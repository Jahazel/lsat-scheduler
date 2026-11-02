# Findings: Study settings

Brief: [brief.md](brief.md). Tracking ticket: #449.

Study settings is designed desktop-first, so the examples are desktop web screens from Mobbin, linked below. The screenshots stay out of this public repository because they show other companies' apps; the owner keeps a local copy in `refs/` (41 desktop web files, plus 7 phone files in `refs/phone/`). A phone example appears only where it answers how the layout fits a phone, and it is labeled mobile. Mobbin shows still frames only, so every motion read from Mobbin is marked **inferred**.

Mark each pattern on its `Owner:` line: like, dislike, or leave it blank.

DrillMap fit is judged against `docs/design/design-system/`. Its motion tokens are `fast` 120 ms, `base` 200 ms, and `slow` 320 ms. The standard easing is `cubic-bezier(0.2, 0, 0, 1)` and the exit easing is `cubic-bezier(0.4, 0, 1, 1)`. Overlays and panels fade in with an 8 px rise and leave on the exit curve at 200 ms with no rise. Reduced motion drops movement and keeps 120 ms fades. The settings page reuses the onboarding controls: the Goal step, the Week step with its day table, `OfficialAttempts`, and the `LivePreview` aside (shown from the `lg` breakpoint up). The failure toast in `FailureNotice.tsx` is a fixed bottom slot, `z-50`, 360 px wide on desktop, with a 200 ms leave.

## 1. Official LSAT attempts: which list pattern reads best for add, edit, and remove on a settings page?

### 1A. Rows in a bordered list, "Add" link under the last row, one remove control per row
- Desktop web: [Airwallex "Additional limit"](https://mobbin.com/screens/fb50a2ec-4d10-47a6-a924-eb8ec7485595) (field pairs, trash icon at the row end, "+ Additional limit" below), [Squarespace "Add amount"](https://mobbin.com/screens/5577fe27-ea66-4c81-b699-1cf7d36ac764) (three filled rows, red trash icon, "+ ADD AMOUNT" under them), [Square modifier list](https://mobbin.com/screens/ffd7c58c-827a-4891-aa84-e45caa20442f) (a ready blank row at the bottom). Refs: `1-airwallex-additional-limit-row.png`, `1-squarespace-add-amount-rows.png`, `1-square-modifier-list-inline-new-row.png`.
- Works when: each item has two or three short fields and the student edits in place.
- Tradeoffs: an icon-only trash button needs a label for screen readers and a 44 px tap target on phone. A row removed by accident stays gone until the student leaves without saving, so the brief's "saved on Save changes" rule is the safety net.
- DrillMap fit: strong. The brief already fixes the shape ("Add attempt", remove button, focus on the new row's score), and the fields are the same score and month controls `OfficialAttempts` uses today.
- Owner: like (accepted researcher pick, 2026-11-01)

### 1B. Rows with a text "Remove" link under each item
- Desktop web: [Turo FAQs](https://mobbin.com/screens/289e14d5-ecdb-4226-826a-569b7e236ba8) (red "Remove" text under each item, "Add another FAQ" button, then Save), [Plain "Remove option"](https://mobbin.com/screens/246327c9-933f-48aa-ab7b-6e06e6e5a958) (each option is a boxed card with its own "Remove option"). Refs: `1-turo-add-another-faq-remove.png`.
- Works when: each item is tall, so a link under it reads better than an icon beside it.
- Tradeoffs: it makes each row taller. An attempt has two short fields, so the link spends vertical space for no gain.
- DrillMap fit: medium. The visible word "Remove" is clearer than an icon, so it is a fallback if the icon is missed.
- Owner: —

### 1C. Empty state first, then rows (the owner's chosen start)
- Desktop web: [Buffer "No tags yet"](https://mobbin.com/screens/5d106472-8f62-455b-88dc-34b6edf98499), [Resend "No webhooks yet"](https://mobbin.com/screens/10bee097-08c8-481f-9fc6-03b08a1a51ce), [Oyster Departments](https://mobbin.com/screens/1d105289-3f8e-47c8-887b-8ecbdefcffb6) (one plain sentence where the rows go). Refs: `1-buffer-no-tags-empty-state.png`, `1-resend-no-webhooks-empty-state.png`, `1-oyster-departments-empty-table.png`.
- Works when: zero items is a normal state. NN/g's empty-state guidance: "communicate system status" and "provide direct pathways for key tasks" ([NN/g, Designing Empty States](https://www.nngroup.com/articles/empty-state-interface-design/)).
- Tradeoffs: Buffer and Resend use a large box or illustration, too heavy for one optional list. Oyster's one plain line is closest to DrillMap's size.
- DrillMap fit: strong, as one `text-small` line "No official attempts yet" with the "Add attempt" button. It is the empty state of 1A, not a different pattern.
- Owner: like (accepted researcher pick, 2026-11-01)

### 1D. Add in a side panel or dialog, list stays read-only
- Desktop web: [Klaviyo "Edit social links group"](https://mobbin.com/screens/028a4b8a-a93c-4ea6-b0e6-0410f9fe9bc5) (the page behind says "No social links added"; the add form opens in a slide-over). No ref saved.
- Works when: each item has many fields.
- Tradeoffs: a second save step inside the first fights the single "Save changes" model.
- DrillMap fit: weak. An attempt has two fields.
- Owner: —

Researcher's view: 1A with the 1C empty state. Keep an icon remove button with a label for assistive tech; use 1B's text link only if the icon tests badly.

## 2. Save bar: where does "Save changes" sit at desktop width, and how does it stay reachable on a long page?

### 2A. A bar that appears at the bottom when something changes
- Desktop web: [Laravel Cloud](https://mobbin.com/screens/bce31f98-3283-4c47-971c-8a0dda21ca4b) (dark floating pill "Unsaved changes · Reset · Save"), [Clerk](https://mobbin.com/screens/5fcadf3b-ace8-4161-a761-bff11b623aa1) (same pill), [Chatbase](https://mobbin.com/screens/dc64e990-df30-4371-a3c6-a3e73e9370f2) ("You have unsaved changes. Do you wish to save them?" with Discard and Save changes), [beehiiv](https://mobbin.com/screens/831e961b-eec8-4f2e-9d3f-8fed464cd547) ("Unsaved changes · Exit · Save Changes"), [Airwallex](https://mobbin.com/screens/fb50a2ec-4d10-47a6-a924-eb8ec7485595) (full-width footer with Cancel and Save changes). Refs: `2-laravel-floating-unsaved-pill.png`, `2-clerk-floating-unsaved-pill.png`, `2-chatbase-unsaved-changes-bar.png`, `2-beehiiv-unsaved-bar-with-preview.png`, `1-airwallex-additional-limit-row.png`. Appearing on first edit is **inferred**.
- Phone apps (mobile): [Mindtrip](https://mobbin.com/screens/de3804c0-0266-4ef3-b362-e530b3d71a79), [Binance](https://mobbin.com/screens/af01b612-476b-454a-a724-5711d3a13de1), [Lifesum](https://mobbin.com/screens/c7d33b1c-3533-4368-bb22-b4210ed0e1a4), [Cleo AI](https://mobbin.com/screens/aca1853f-2e05-42db-a9c4-d975f6f6732a) (a note card sits just above the full-width Save, the same shape as the brief's "Changes apply to your next weekly schedule"). Refs: `phone/2-*-sticky-save*.png`.
- Works when: the page is longer than the viewport, and appearing says "something changed", which fits the Clean state with no button.
- Tradeoffs: it covers the page bottom, so the last row needs padding. NN/g says a sticky element must earn its space and be small and opaque ([NN/g, Sticky Headers](https://www.nngroup.com/articles/sticky-headers/); about page headers, so by analogy). Laravel and Clerk add a "Reset"; the brief has none.
- DrillMap fit: strong. One component: floating bar centered on the content column at desktop, full-width at phone. It must stack with the failure toast slot.
- Owner: like (accepted researcher pick, 2026-11-01)

### 2B. A Save button in the page header, always visible
- Desktop web: [Apollo](https://mobbin.com/flows/04ff601c-9646-43ad-8e1f-7acb49d0f215) (yellow Save at top right in every frame), [Podia](https://mobbin.com/screens/d859162e-b8dc-44d6-a4b7-543295476f6a), [WorkOS](https://mobbin.com/screens/704c0a53-cf66-4314-ba0f-651344873fb6) (Discard and Save in the top bar). Refs: `2-apollo-top-right-save.png`.
- Works when: the page has a persistent top bar.
- Tradeoffs: it scrolls away on a long page unless the header is sticky, looks the same before and after a change, and does not match the brief's hide-after-save.
- DrillMap fit: weak.
- Owner: —

### 2C. A footer inside each section card, or one button at the end of the page
- Desktop web: [Dub](https://mobbin.com/screens/049ed2e5-676e-493f-9d99-54f9871983f3) (grey footer strip in each card), [Homerun](https://mobbin.com/screens/dfda044e-23fc-48b4-b530-e932eca9885e) (a Save per card, disabled while clean), [Turo](https://mobbin.com/screens/289e14d5-ecdb-4226-826a-569b7e236ba8) (one Save after the last row). Refs: `2-dub-card-footer-save.png`, `2-homerun-per-card-save.png`.
- Works when: sections save on their own, or the page is short.
- Tradeoffs: two buttons make it unclear whether both sections need saving; the brief has one Save. An end button can be off screen after a Goal edit.
- DrillMap fit: medium on a short page, weak once Week plus preview makes it tall.
- Owner: —

Researcher's view: 2A, one bar floating at desktop and full-width at phone.

## 3. Section layout at desktop: one centered column, two columns, or side navigation?

### 3A. One centered column with a card per section
- Desktop web: [OpenAI Platform profile](https://mobbin.com/flows/31a72c68-db57-498f-90db-e23bb87b7d82), [Plain "Create new label"](https://mobbin.com/screens/d74ef0c0-d858-42c6-9aa6-d0ae93238205), [Homerun](https://mobbin.com/screens/dfda044e-23fc-48b4-b530-e932eca9885e), [Preply](https://mobbin.com/screens/45e17072-c050-4473-b293-3e2dda2a6f0b). Refs: `3-openai-centered-column.png`, `3-plain-sidebar-single-card.png`, `2-homerun-per-card-save.png`, `3-preply-left-nav-list.png`.
- Works when: a few sections read top to bottom. NN/g: "Present fields in a single column layout" and section two topics into "two separate groups of fields" ([NN/g, Web Form Design](https://www.nngroup.com/articles/web-form-design/)).
- Tradeoffs: on 1440 px the sides stay empty unless the preview fills them (question 7).
- DrillMap fit: strong. Matches onboarding's single column. Two cards, "Goal" and "Week".
- Owner: like (accepted researcher pick, 2026-11-01)

### 3B. Two columns: section title and help left, fields right
- Desktop web: [Better Stack](https://mobbin.com/screens/220d4ae9-a624-43d9-8e3c-7bb4823d2c93), [Mintlify](https://mobbin.com/screens/31a78b73-f62f-4129-8d80-df093e8b7021), [Dub](https://mobbin.com/screens/049ed2e5-676e-493f-9d99-54f9871983f3). Refs: `3-betterstack-label-left-fields-right.png`, `3-mintlify-label-left-fields-right.png`, `2-dub-card-footer-save.png`.
- Works when: each setting has a paragraph of help and settings are many.
- Tradeoffs: the day table and attempts rows need width; a right column of about 640 px gives less than onboarding. NN/g warns multiple columns "interrupt the vertical momentum" (these keep fields in one column, so it applies less). Phone needs a second layout.
- DrillMap fit: medium. The left column would hold one title and one help line.
- Owner: —

### 3C. Side navigation between Goal and Week
- Desktop web: [Laravel Cloud](https://mobbin.com/screens/bce31f98-3283-4c47-971c-8a0dda21ca4b), [Featurebase](https://mobbin.com/screens/3c3982bd-0037-4887-bf50-535517024fcd), [Preply](https://mobbin.com/screens/45e17072-c050-4473-b293-3e2dda2a6f0b). Refs: `3-preply-left-nav-list.png`.
- Works when: there are many settings pages, each with its own Save.
- Tradeoffs: all examples have many entries; two entries is a nav level with almost nothing in it, and switching adds a second kind of leave guard.
- DrillMap fit: weak. There is already a top nav, and the brief wants one page and one Save.
- Owner: —

Researcher's view: 3A, with the preview filling the right side at `lg` and wider.

## 4. Read-only current score: how do settings pages show a value the user cannot edit here, and point to where it changes?

### 4A. Plain text row with a short reason
- Desktop web: [Gusto](https://mobbin.com/screens/b56a525f-eab5-4907-883c-7dac3241451e) (values as text, "Edit" link at right), [QuickBooks](https://mobbin.com/screens/686f2e30-43c9-423c-9aa8-9d3bd461eabd) (label and value pairs). Refs: `4-gusto-read-summary-edit-links.png`.
- Works when: the value is information, not a control. Queensland's standard: read-only data should not be in form controls because "in some browsers these may look editable, which is very likely to cause confusion" ([Queensland Government, Read-only data](https://www.forgov.qld.gov.au/communication-and-publishing/website-standards-guidelines-and-templates/consistent-user-experience-standard/module-4-online-forms/module-4-checkpoint-20-read-only-data)).
- Tradeoffs: Gusto and QuickBooks point to an edit action; DrillMap has none, so the pointer is text: "Updates with each weekly upload".
- DrillMap fit: strong. Label, value in `text-body font-semibold`, caption in `text-caption text-smoke`, no input border.
- Owner: like (accepted researcher pick, 2026-11-01)

### 4B. Greyed, locked input with a hint under it
- Desktop web: [OpenAI Platform](https://mobbin.com/flows/31a72c68-db57-498f-90db-e23bb87b7d82) (grey email field), [Apollo profile](https://mobbin.com/flows/7cc10809-4d06-4a67-b9fe-152047974b38) (grey Login email and Password with "Edit"), [Apollo locked credit limits](https://mobbin.com/flows/04ff601c-9646-43ad-8e1f-7acb49d0f215) (grey fields, lock icon, "You must be on a paying plan to reallocate credits." plus link). Refs: `4-openai-greyed-email.png`, `4-apollo-greyed-login-email-edit.png`, `4-apollo-locked-fields-with-upgrade-link.png`.
- Works when: the value belongs in the form grid and the student should see it exists.
- Tradeoffs: a grey input can look broken. Read-only inputs stay focusable for screen readers, unlike disabled ones ([LeafLink](https://stash.leaflink.com/components/field.html), second-hand). Carbon reserves "disabled" for controls that become editable later ([Carbon, Read-only states](https://carbondesignsystem.com/patterns/read-only-states-pattern/)).
- DrillMap fit: medium. It would look like the real Goal score input beside it. Copy Apollo's hint line, not the grey box.
- Owner: —

### 4C. Value with a link to the place that changes it
- Desktop web: [Apollo](https://mobbin.com/flows/7cc10809-4d06-4a67-b9fe-152047974b38) ("Edit" beside the locked value), [Gusto](https://mobbin.com/screens/b56a525f-eab5-4907-883c-7dac3241451e). Refs: `4-apollo-greyed-login-email-edit.png`, `4-gusto-read-summary-edit-links.png`.
- Works when: another page lets the student change the value.
- Tradeoffs: links into other screens are out of scope per the brief, and a link would leave with unsaved edits.
- DrillMap fit: weak for now. Add only the caption.
- Owner: —

Researcher's view: 4A, above the Goal score field, with the caption "Updates with each weekly upload".

## 5. Saved confirmation: an inline message near the button, a toast, or both? How long does it stay?

### 5A. Toast
- Desktop web: [Preply](https://mobbin.com/screens/45e17072-c050-4473-b293-3e2dda2a6f0b) (top right), [Modal](https://mobbin.com/screens/87b2d397-bbe1-4398-ad00-f8143c60f24f) (bottom right), [Gusto](https://mobbin.com/screens/b56a525f-eab5-4907-883c-7dac3241451e) (bottom left), [Pinterest](https://mobbin.com/screens/49c1af94-81e4-479e-8003-a9dbc3141512) (bottom center), [Digg](https://mobbin.com/screens/50c205af-a533-4054-9c8e-4706c845c052) (bottom right). Flows: [OpenAI profile](https://mobbin.com/flows/31a72c68-db57-498f-90db-e23bb87b7d82) (green toast, top center, frame 3 of 3), [Apollo](https://mobbin.com/flows/7cc10809-4d06-4a67-b9fe-152047974b38) ("User saved", top right). Refs: `5-modal-bottom-right-toast.png`, `5-openai-profile-updated-toast.png`, `5-apollo-user-saved-toast.png`. Auto-dismiss is **inferred**.
- Works when: the save is routine and the student need not act.
- Tradeoffs: Material: snackbars "shouldn't interrupt the user experience, and they don't require user input to disappear" ([Material Components Android, Snackbar](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md)); presets are short, long, indefinite, with no ms value. Dialpad recommends at least 6000 ms ([Dialpad Dialtone, Toast](https://dialtone.dialpad.com/components/toast.html), second-hand). W3C 4.1.3 requires status messages announced "without receiving focus" ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)), so `role="status"`.
- DrillMap fit: medium. DrillMap's toast is failure-only (`role="alert"`, red icon, error code); a success toast of the same shape could be confused with it.
- Owner: —

### 5B. Inline message in the place where the button was
- Desktop web: [Curater](https://mobbin.com/screens/c9028528-18b1-4ed2-ae0f-ed67a5cfa950) (green tick and "Saved" beside the now-grey Save; a toast also shows). Ref: `5-curater-saved-tick-plus-toast.png`.
- Works when: the student's eyes are on the button they pressed.
- Tradeoffs: Save hides after saving, so the message must live in the bar's slot and fade by itself. Only one example, and it pairs with a toast.
- DrillMap fit: strong. The bar swaps to "Saved. Changes apply to your next weekly schedule." with a tick, then fades. The permanent Clean-state note stays.
- Owner: like (accepted researcher pick, 2026-11-01)

### 5C. Both
- Desktop web: [Curater](https://mobbin.com/screens/c9028528-18b1-4ed2-ae0f-ed67a5cfa950) (inline "Saved" plus a black toast). Ref: `5-curater-saved-tick-plus-toast.png`.
- Works when: the button can be off screen at save end. With a sticky bar it cannot.
- Tradeoffs: two messages for one event; only one may carry `role="status"`.
- DrillMap fit: weak.
- Owner: —

Researcher's view: 5B, held 6 s (Dialpad's second-hand minimum; no primary source gives a number), then faded on the exit curve, with `role="status"`. The failure case keeps the toast.

## 6. Leave guard: what wording and dialog pattern do apps use for unsaved changes?

### 6A. Two buttons: stay or leave
- Desktop web: [Productboard](https://mobbin.com/flows/bce02497-1036-4b49-bf01-9c829c6e6aa3) ("Leave without saving?" — "By leaving you will lose your unsaved changes on Product Portal. Do you want to continue?"; "Stay here" and red "Leave without saving"), [Uvodo](https://mobbin.com/flows/c0c2487a-bfc3-4a28-8899-e46290a46687) ("You have unsaved changes." "Are you sure you want to leave?"; "Leave" and "Save changes"). Refs: `6-productboard-leave-without-saving.png`, `6-uvodo-unsaved-changes-leave.png`.
- Works when: save needs a valid form and leaving is the only other choice.
- Tradeoffs: Productboard puts the loss in the button. Uvodo saves from the dialog, which would fail on an invalid form.
- DrillMap fit: strong, matches "Leave" and "Stay". NN/g: use "response options that summarize what will happen" rather than Yes and No ([NN/g, Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/)). Apple: prefer verbs tied to the alert text ([Apple HIG, Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)).
- Owner: like (accepted researcher pick, 2026-11-01)

### 6B. Three buttons: save, discard, cancel
- Desktop web: [Salesforce](https://mobbin.com/screens/ff8c986b-e12e-4bee-8b31-53740c045b5f) (Cancel, Discard, Save), [Customer.io "Just a minute!"](https://mobbin.com/screens/25eb3dc6-8fb5-4b98-a213-7503d661e8ab) (Go back, Discard changes, Save & Continue), [Workable](https://mobbin.com/screens/381e96da-9c8f-4146-9d7a-5d03c8f06545) (Cancel, Save), [Squarespace "Exit Without Saving?"](https://mobbin.com/flows/3ff46f47-1c72-4d8a-b84b-23f7f424ded9) (SAVE, red EXIT). Refs: `6-salesforce-save-changes-segment.png`, `6-customerio-just-a-minute.png`, `6-workable-save-changes.png`, `6-squarespace-exit-without-saving.png`.
- Works when: most students want to keep edits and saving cannot fail validation.
- Tradeoffs: more to read; a save from the dialog hits page validation; "Cancel" is unclear in a "Save changes…?" question.
- DrillMap fit: medium. Safest for long edits but conflicts with the brief's two-button flow.
- Owner: —

### 6C. Autosave as a draft, with a notice instead of a dialog
- Desktop web: [Lindy](https://mobbin.com/screens/36cbbac6-42aa-415a-9f8f-72b60cc19c40) ("Your recent edits are saved as a draft"), [Relevance AI](https://mobbin.com/screens/9df6886a-73d0-4d08-a805-a2b920d71e21). Ref: `6-lindy-unpublished-changes.png`.
- Works when: there is a draft and a live version.
- Tradeoffs: DrillMap has one version; a draft is a new state, and the brief says edits are lost on Leave.
- DrillMap fit: weak. Shows the guard can be avoided by a different data model.
- Owner: —

The browser's own prompt on tab close or reload cannot carry custom wording. NN/g: dialogs are for "actions with serious consequences" and "if you warn people too much, they stop paying attention", so the guard must not fire on a clean page.

Researcher's view: 6A with "Stay" and "Leave". Consider the title "Leave without saving?" and the button "Leave without saving", as Productboard does. Focus lands on "Stay" (own view).

## 7. Week preview: where does the live week preview sit next to the daily-capacity table at desktop and on phone?

### 7A. A side panel on the right, next to the whole form
- Desktop web: [Chatbase](https://mobbin.com/screens/6985aef6-bd94-40a3-84af-8a32ec272e26), [GitBook](https://mobbin.com/screens/6617aabc-f515-4293-97f8-131dbfb105c1), [Klaviyo](https://mobbin.com/screens/cb253baa-b5f8-4bd0-9536-dffa97f887c8), [Pipedrive Web Forms](https://mobbin.com/screens/ececb1c7-c036-4aec-b140-2bfa69769e7f), [incident.io](https://mobbin.com/screens/a5b387f4-12a2-48b0-9843-6be3b82a2d7e), [beehiiv](https://mobbin.com/screens/831e961b-eec8-4f2e-9d3f-8fed464cd547). Refs: `7-chatbase-live-preview-right.png`, `7-gitbook-preview-right.png`, `7-klaviyo-preview-right.png`, `7-pipedrive-preview-right.png`, `7-incident-io-preview-right.png`, `2-beehiiv-unsaved-bar-with-preview.png`.
- Works when: the preview is the result of many fields and stays in view while editing.
- Tradeoffs: halves the width; a phone cannot show both. In every example the form is a narrow left column of about 380 to 480 px, narrower than the day table.
- DrillMap fit: strong. Onboarding's `LivePreview` is an `aside` with `aria-label="Preview of This week"`, shown from `lg`. Reuse it with the same breakpoint. It also fills the space 3A leaves empty.
- Owner: like (accepted researcher pick, 2026-11-01)

### 7B. Computed result beside each input (no separate preview)
- Desktop web: [Monarch](https://mobbin.com/screens/1bad63fb-5716-4e40-9b1a-9fe704e6d30e) (a "Monthly Budget" column beside editable "Target Amount"). Ref: `7-monarch-computed-column-beside-inputs.png`. Updating as the student types is **inferred**.
- Works when: each input has one result that fits a cell.
- Tradeoffs: a week preview is seven days of drills, not one number.
- DrillMap fit: weak as the whole preview; medium as a weekly-total line under the table.
- Owner: —

### 7C. Preview above the controls, stacked (phone fit)
- Phone apps (mobile): [Vocabulary](https://mobbin.com/screens/e4c5803f-2fc3-4895-9697-7e27ed175a6c) ("Your widget reflects the settings you select below."), [GitHub code options](https://mobbin.com/screens/0ebeaa54-1434-437d-b12b-d04c3f244d48), [Bevel](https://mobbin.com/screens/5e602476-56aa-4465-af48-e061d9749b3e). Refs: `phone/7-vocabulary-preview-above-controls.png`, `phone/7-github-preview-above-options.png`, `phone/7-bevel-preview-above-options.png`.
- Desktop web: none found.
- Works when: the preview is small and the controls fit under it.
- Tradeoffs: a week preview is far taller than a widget; above the table it pushes the table below the fold, under it the effect is out of sight.
- DrillMap fit: weak as shown. Onboarding hides the preview below `lg`; settings can do the same, or show a collapsed "Preview your week" row under the day table that opens a sheet (a proposal; no example found).
- Owner: —

Researcher's view: 7A at `lg` and wider, reusing `LivePreview`. No phone preview in the first build.

## Flow and motion

Proposals only; they become `motion.md` rows in a later step. Apple: "Add motion purposefully, supporting the experience without overshadowing it" and "Make motion optional" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)). Material: fade is "used for UI elements that enter or exit within the bounds of the screen" ([Material Components Android, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)); it gives no durations, so every duration below is a DrillMap token.

| Step | Proposed motion | Token | Reduced motion |
| --- | --- | --- | --- |
| Save bar appears on first change | Fade in with an 8 px rise from the bottom (Laravel Cloud and Clerk show it only after a change; the motion is **inferred**) | `base`, standard easing | 120 ms fade, no rise |
| Save bar disappears | Fade out, no rise, after the Saved message has shown | `base`, exit easing | 120 ms fade |
| Saved confirmation | Bar note swaps to "Saved. Changes apply to your next weekly schedule." with a tick; `role="status"`, no focus move ([W3C 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)); stays 6 s (second-hand, question 5), then the bar fades | `fast` swap, then `base` exit | Same, fades only |
| Save pressed with invalid fields | Message and red border appear under each invalid field with no motion (NN/g: "an actionable error message below or next to the problem field", [NN/g, Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/)). Then scroll to and focus the first invalid field. GOV.UK links to the first field with an error ([GOV.UK, Error summary](https://design-system.service.gov.uk/components/error-summary/)); NN/g has no scroll rule, so scroll and focus are the researcher's view | Smooth scroll, browser-timed | Jump, no smooth scroll |
| Leave guard opens | Dialog fades in with an 8 px rise over a dim backdrop; focus on "Stay" (researcher's view) | `base`, standard easing | 120 ms fade |
| Leave guard closes | Fade, no rise | `base`, exit easing | 120 ms fade |
| "Add attempt" | New row fades in; rows below slide down by its height (**inferred** from the Airwallex and Square blank rows); focus on the new row's score per the brief | `base`, standard easing | Row appears at once; focus still moves |
| Remove an attempt | Row fades, rows below close the gap; focus to the next row's remove button, or "Add attempt" if none is left; announce "Attempt removed" with `role="status"` (researcher's view) | `base`, exit easing | Row disappears at once |
| Live week preview updating | Updates at once on each field change. NN/g: "0.1 second is about the limit for having the user feel that the system is reacting instantaneously", so no loading cue ([NN/g, Response Times](https://www.nngroup.com/articles/response-times-3-important-limits/)). The changed day cross-fades its text (**inferred**) | `fast` | Plain swap |
| Save fails | Existing failure toast; the bar stays and the toast slot clears it | Existing 200 ms leave | Existing |

No source, the researcher's view: the failure toast slot and the save bar both sit at the bottom. While the bar shows, the toast must stack above it, or it hides Save.

## Source gaps
- Material 3 and Apple HIG pages load text with JavaScript. Apple quotes come from the page's JSON data. Material quotes come from Material Components for Android, because `m3.material.io` returned only a page title. No M3 duration values were used.
- NN/g has no page on unsaved-changes dialogs, toast timing, or scroll-to-first-error. Those rows cite NN/g for wording and placement only, and GOV.UK, W3C, and Dialpad for the rest. The 6 s confirmation time rests on Dialpad's second-hand guidance.
- Baymard: [inline form validation](https://baymard.com/blog/inline-form-validation) says to check "when the user leaves the field" and that "inline validation does not entirely replace the need for traditional error page and design". That supports keeping errors on Save. No other row uses Baymard.
- Mobbin gave no flow that shows a leave guard fading in or a toast timing out. Every motion read from Mobbin is inferred from stills.
- No desktop web example was found for a preview stacked above a form (7C).
- `refs/` holds 48 screenshots, not committed. Mobbin image links expire after 30 days, so the local files are the record.

## Sources
- Mobbin screens and flows linked above.
- Apple HIG, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Apple HIG, Alerts: https://developer.apple.com/design/human-interface-guidelines/alerts
- Material Components Android, Motion: https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- Material Components Android, Snackbar: https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md
- NN/g: https://www.nngroup.com/articles/confirmation-dialog/ , https://www.nngroup.com/articles/errors-forms-design-guidelines/ , https://www.nngroup.com/articles/web-form-design/ , https://www.nngroup.com/articles/empty-state-interface-design/ , https://www.nngroup.com/articles/response-times-3-important-limits/ , https://www.nngroup.com/articles/sticky-headers/
- Baymard: https://baymard.com/blog/inline-form-validation
- W3C 4.1.3: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- GOV.UK Error summary: https://design-system.service.gov.uk/components/error-summary/
- Queensland Government, Read-only data: https://www.forgov.qld.gov.au/communication-and-publishing/website-standards-guidelines-and-templates/consistent-user-experience-standard/module-4-online-forms/module-4-checkpoint-20-read-only-data
- Carbon, Read-only states: https://carbondesignsystem.com/patterns/read-only-states-pattern/
- LeafLink field (second-hand): https://stash.leaflink.com/components/field.html
- Dialpad Toast (second-hand): https://dialtone.dialpad.com/components/toast.html
- DrillMap: `docs/design/design-system/` (`tokens.css`, `05-foundations.jsx`, `06-component-states.jsx`, `07-this-week-patterns.jsx`); `src/app/onboarding/LivePreview.tsx`, `src/components/FailureNotice.tsx`, `src/app/onboarding/OnboardingWizard.tsx`
