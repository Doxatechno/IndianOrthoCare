

## Plan: Update "Expiring Soon" Threshold to 180 Days (6 Months)

### What changes
Update the warranty expiration threshold from 90 days to 180 days in two files:

1. **`src/pages/EquipmentPage.tsx`** — Change `daysLeft <= 90` to `daysLeft <= 180` in the `getWarrantyStatus` function
2. **`src/components/equipment/EquipmentCard.tsx`** — Change `daysLeft <= 90` to `daysLeft <= 180` in the `getWarrantyInfo` function

### Result
After this change, **24 instruments** (primarily Stryker accessories installed July 2021) will show as "Expiring Soon" instead of "Active."

