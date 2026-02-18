# CSV Upload Guide for Affiliate Allowance Codes

## File Format Requirements

- **Encoding**: UTF-8
- **Max File Size**: 10MB
- **Format**: CSV (Comma-Separated Values)

## Required Columns

You must include **ONE** of these columns to identify the affiliate:
- `affiliateId` - The unique ID of the affiliate (e.g., `cmk43uj5e0001og3j1ffd3whm`)
- `affiliateEmail` - The email address of the affiliate (e.g., `alice@example.com`)

**AND** you must include:
- `allowanceAmount` - The monthly allowance amount in dollars (e.g., `150`, `200.50`)

## Optional Columns

- `code` - Custom discount code (e.g., `ALICE-GIFT`). If left empty, a unique code will be auto-generated.
- `discountType` - Either `percentage` or `fixed_amount` (defaults to `fixed_amount` if not specified)
- `discountValue` - The discount amount (e.g., `15` for $15 off or `20` for 20% off)
- `freeShipping` - Boolean: `true`, `false`, `1`, `0`, `yes`, `y`, `no`, `n` (defaults to `false`)
- `description` - Custom description for the code (will be auto-generated if not provided)
- `syncToShopify` - Boolean: `true`, `false`, `1`, `0`, `yes`, `y`, `no`, `n` (defaults to `true`)

## Example CSV Files

### Example 1: Minimal (Required Fields Only)
```csv
affiliateEmail,allowanceAmount
alice@example.com,150
bob@example.com,200
carol@example.com,120
```

### Example 2: Full Featured
```csv
affiliateEmail,allowanceAmount,code,discountType,discountValue,freeShipping,description,syncToShopify
alice@example.com,150,ALICE-GIFT,fixed_amount,15,true,"Alice monthly allowance + free shipping",true
bob@example.com,200,BOB-MONTH,percentage,20,false,"Bob 20% off allowance",true
carol@example.com,120,,percentage,10,true,"Auto-code generated; 10% off + free ship",false
```

### Example 3: Using Affiliate ID
```csv
affiliateId,allowanceAmount,code,discountType,discountValue,freeShipping,description,syncToShopify
cmk43uj5e0001og3j1ffd3whm,150,ID-TEST-1,fixed_amount,20,true,"Testing with affiliateId",true
```

## Test Scenarios

### Scenario 1: Basic Allowance (No Discount)
- **affiliateEmail**: `eve@example.com`
- **allowanceAmount**: `100`
- **code**: (empty - will auto-generate)
- **discountType**: `fixed_amount`
- **discountValue**: `0`
- **freeShipping**: `false`
- **syncToShopify**: `true`

**Result**: Creates a basic allowance code with no discount, just the $100 allowance.

### Scenario 2: Percentage Discount + Free Shipping
- **affiliateEmail**: `frank@example.com`
- **allowanceAmount**: `250`
- **code**: `FRANK-SUMMER`
- **discountType**: `percentage`
- **discountValue**: `15`
- **freeShipping**: `true`
- **syncToShopify**: `true`

**Result**: Creates allowance code `FRANK-SUMMER` with 15% discount + a separate free shipping code.

### Scenario 3: Fixed Amount Discount
- **affiliateEmail**: `dave@example.com`
- **allowanceAmount**: `180`
- **code**: `DAVE-VIP`
- **discountType**: `fixed_amount`
- **discountValue**: `25`
- **freeShipping**: `false`
- **syncToShopify**: `true`

**Result**: Creates code `DAVE-VIP` with $25 off discount.

### Scenario 4: Auto-Generated Code
- **affiliateEmail**: `carol@example.com`
- **allowanceAmount**: `120`
- **code**: (empty)
- **discountType**: `percentage`
- **discountValue**: `10`
- **freeShipping**: `true`
- **syncToShopify**: `false`

**Result**: Auto-generates a unique code like `AFFILIATE-A1B2C3D4` with 10% discount + free shipping, but does NOT sync to Shopify.

## Boolean Field Values

The following values are accepted for boolean fields (`freeShipping`, `syncToShopify`):
- **True**: `true`, `1`, `yes`, `y` (case-insensitive)
- **False**: `false`, `0`, `no`, `n`, or empty (case-insensitive)

## Discount Type Values

- **percentage**: For percentage discounts (e.g., 20% off)
- **fixed_amount**: For fixed dollar amount discounts (e.g., $15 off)

## Important Notes

1. **Code Uniqueness**: If you specify a custom code and it already exists, the import will fail for that row.

2. **Auto-Generated Codes**: If you leave `code` empty, the system will generate a unique code like `AFFILIATE-XXXX`.

3. **Free Shipping**: When `freeShipping` is `true`, a separate shipping code will be created automatically (e.g., if allowance code is `ALICE-GIFT`, shipping code might be `ALICE-GIFT-SHIP`).

4. **Shopify Sync**: By default, codes are synced to Shopify. Set `syncToShopify` to `false` to skip Shopify sync.

5. **Expiration**: All codes expire at the end of the current month automatically.

6. **Usage Limit**: All allowance codes are one-time use only (maxUsage = 1).

## Error Handling

If there are errors in your CSV:
- The import will continue processing other rows
- Errors will be reported in the response
- Successful imports will still be created
- Check the error messages to fix problematic rows

## Example Error Messages

- `Row 2: affiliateId or affiliateEmail is required` - Missing affiliate identifier
- `Row 3: allowanceAmount is required and must be a number` - Invalid allowance amount
- `Row 5: Code "ALICE-GIFT" already exists` - Duplicate code
- `Row 7: Affiliate not found` - Affiliate email/ID doesn't exist in system
