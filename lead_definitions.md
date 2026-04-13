# Lead Metric Definitions

## Global Settings

| Setting | Value |
|---------|-------|
| Universe | All Pipelines |
| Date Filter | `last_crm_lead_datetime` (IST-adjusted timestamps) |
| Applied | Always |

---

## HubSpot Property Internal Values

### `form_is_manufacturing`
| Internal Value | Label |
|----------------|-------|
| `Yes` | Yes |
| `No` | No |

### `form_designation`
| Internal Value | Label |
|----------------|-------|
| `Owner` | Owner / Director |
| `HOD` | Head of Department |
| `Other` | Employee / Others |

---

## Deal Stage IDs

| Stage ID | Label |
|----------|-------|
| `2032072431` | 1. Lead |
| `2031950570` | 2. Available or Meeting Done |
| `37103393` | 3. Demo Scheduled |
| `37103394` | 4. First Demo Done |
| `2031950573` | 5. Aligned on Product |
| `2042544837` | 6. Cost Accepted |
| `2031950574` | 7. Paid - Data Agent |
| `32483351` | 8. Lost |
| `2031950576` | 9. Junk |
| `32483354` | Junk |
| `37103391` | Lead |
| `32483353` | Paid |
| `56188220` | Un Assigned |
| `49686692` | Onboarding |
| `221230658` | Training Phase 1 |
| `223574801` | Punarjanam Possible |
| `223534519` | Adoption |
| `32638351` | Is Implemented |
| `56217927` | Re Training |
| `56808258` | Unknown |
| `56928076` | On Hold |
| `49708039` | Red Zone |
| `49655621` | Pink Zone |
| `49708040` | Yellow Zone |
| `49689255` | Training Phase 2 |
| `49752367` | Expansion |
| `32569858` | Churn |
| `57310059` | TZ Test or Cancelled |
| `953163316` | Advocacy |

---

## Metric Definitions

| Metric | Properties & Conditions |
|--------|------------------------|
| **Sourced** | `deal_source_25` HAS value |
| **MQL** | `form_is_manufacturing = 'Yes'` AND `form_designation IN ('Owner', 'HOD')` |
| **SQL** | `first_demo_schedule_datetime` HAS_PROPERTY |
| **Demo Done** | `first_demo_complete_datetime` HAS_PROPERTY |
| **Paid** | `first_payment_date` HAS_PROPERTY |
| **TOFU** | MQL conditions AND `available_or_meeting_done_datetime` NOT_HAS_PROPERTY AND `dealstage NOT IN ('2031950576', '32483354')` |
| **MOFU** | `available_or_meeting_done_datetime` HAS_PROPERTY AND `first_demo_complete_datetime` NOT_HAS_PROPERTY AND `dealstage NOT IN ('2031950576', '32483354')` |
| **BOFU** | `first_demo_complete_datetime` HAS_PROPERTY AND `first_payment_date` NOT_HAS_PROPERTY AND `dealstage NOT IN ('2031950576', '32483354')` |

---

## IST Timestamp Reference

Generate timestamps using Node.js:
```js
const start = new Date('YYYY-MM-01T00:00:00+05:30').getTime();
const end   = new Date('YYYY-MM-31T23:59:59+05:30').getTime(); // adjust last day per month
```

| Period | Start | End |
|--------|-------|-----|
| Feb 2026 | `1769884200000` | `1772303399000` |
| Mar 2026 | `1772303400000` | `1774981799000` |

