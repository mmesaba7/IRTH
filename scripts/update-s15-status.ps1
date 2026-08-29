$ErrorActionPreference = 'Stop'

$path = 'docs\IRTH_PROJECT_STATUS.md'
if (-not (Test-Path $path)) {
  throw "Could not find $path. Run this script from the IRTH repository root."
}

$rawContent = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$originalNewLine = if ($rawContent.Contains("`r`n")) { "`r`n" } else { "`n" }
$content = $rawContent.Replace("`r`n", "`n")

function Replace-Exact {
  param(
    [string]$Old,
    [string]$New,
    [string]$Label
  )

  $oldNormalized = $Old.Replace("`r`n", "`n")
  $newNormalized = $New.Replace("`r`n", "`n")

  if (-not $content.Contains($oldNormalized)) {
    throw "Expected text not found for: $Label"
  }

  $script:content = $content.Replace($oldNormalized, $newNormalized)
}

Replace-Exact @'
# 44. Database Migration Drift

**Status: ⚠️ MUST FIX BEFORE LARGE NEW MODULES**

Important audit finding:

The live Supabase database contains migrations that are newer than the migration files currently committed in GitHub.

GitHub migration history currently ends around:

```text
20260828145001_allow_customer_self_role.sql
```

Live Supabase also contains later migrations for:

* Security helper hardening
* Product Approval
* Product moderation security
* Artisan status
* Public product visibility
* Product media visibility
* Promotion foundation
* Promotion RPC hardening
* Promotion policy cleanup
* Public table grant hardening
* Public marketplace visibility chain
* Anonymous artisan column hardening

This means:

```text
Git migration history
≠
Live database migration history
```

This is called:

> Schema Drift

Before adding major transactional tables, repository migration history should be reconciled with the live database.

Goal:

```text
Git Repository
      =
Reproducible Database Structure
```
'@ @'
# 44. Database Migration Reconciliation

**Status: CLOSED ✅**

The migration drift identified during the project audit has been reconciled.

Completed:

* Recovered missing migration files from Live Supabase migration history.
* Reconstructed missing Inventory, Product Media, Media Reorder, Artisan Product Read, RLS Auto-Enable, and ACL foundations.
* Verified a fresh Local database replay from repository migration history.
* Reconciled Local and Remote migration history.
* Reconstructed Live table, function, and default privilege state where required.
* Restored safe anonymous Artisan Profile column-level grants.
* Reconciled Promotion RPC privileges.
* Hardened public Product Storage visibility.
* Applied and verified the Storage hardening on Live Supabase.

Current public Product Storage access requires:

```text
Published Product
+
Active Artisan
+
Active Country
+
Active Craft
```

Result:

```text
Git migration history
        =
Reproducible database history
        =
Live migration history
```
'@ 'Section 44'

Replace-Exact '* Supabase migration history must be reconciled with Git ⚠️' '' 'Technical debt migration item'

Replace-Exact '**Status: RECOMMENDED / NOT YET CLOSED**' '**Status: CLOSED ✅**' 'S15.0 status'

Replace-Exact @'
Expected result:

```text
Fresh database
+
Repository migrations
=
Expected IRTH database structure
```
'@ @'
Expected result:

```text
Fresh database
+
Repository migrations
=
Expected IRTH database structure
```

Completed:

* Recovered missing migration files from Live Supabase history.
* Reconstructed missing Inventory, Product Media, Media Reorder, Artisan Product Read, RLS Auto-Enable, and ACL foundations.
* Verified fresh Local database replay from migration history.
* Reconciled Local and Remote migration history.
* Reconstructed Live table, function, and default privilege state.
* Fixed anonymous Artisan Profile column-level grants.
* Reconciled Promotion RPC privileges.
* Hardened public Product Storage visibility to require:
  * Published product
  * Active artisan
  * Active country
  * Active craft
* Applied the Storage security hardening to Live Supabase.
* Verified the resulting Live Storage policy.

Result:

```text
Git migration history
        =
Reproducible database history
        =
Live migration history
```
'@ 'S15.0 completion details'

Replace-Exact @'
# 59. CURRENT STATUS

```text
LAST CLOSED MAJOR MILESTONE:
S14 — Public Marketplace DB Integration ✅

CURRENT MAJOR POSITION:
Marketplace Core Completed

NEXT MAJOR PHASE:
Shopping Foundation
```
'@ @'
# 59. CURRENT STATUS

```text
LAST CLOSED MAJOR MILESTONE:
S15.0 — Database Migration Reconciliation ✅

CURRENT MAJOR POSITION:
Shopping Foundation

NEXT TASK:
S15.1 — Market & Pricing Foundation
```
'@ 'Current status'

Replace-Exact @'
# 60. CURRENT TASK

Recommended current task:

```text
S15.0 — Database Migration Reconciliation
```

Status:

```text
NOT STARTED
```

This task should be completed before creating new Market / Cart / Order financial structures.
'@ @'
# 60. CURRENT TASK

```text
S15.1 — Market & Pricing Foundation
```

Status:

```text
READY FOR DISCUSSION / DECISIONS
```

Before implementation, review the approved Market architecture and identify any remaining product decisions.

Do NOT assume a first launch market without explicit approval.
'@ 'Current task'

Replace-Exact @'
* Recommended Database Migration Reconciliation as first next task.
'@ @'
* Recommended Database Migration Reconciliation as first next task.
* Completed S15.0 — Database Migration Reconciliation.
* Recovered missing Live migration history into Git.
* Reconstructed missing Inventory, Media, RLS helper, and ACL foundations.
* Verified full fresh Local database replay.
* Reconciled Local and Remote migration history.
* Hardened public Product Storage visibility.
* Applied and verified the Storage security hardening on Live Supabase.
* Confirmed S15.1 — Market & Pricing Foundation as the next task.
'@ 'Change log'

$content = $content -replace "Known items:\n\n\n", "Known items:`n`n"

if ($originalNewLine -eq "`r`n") {
  $content = $content.Replace("`n", "`r`n")
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)

Write-Host 'IRTH_PROJECT_STATUS.md updated successfully.'
Write-Host 'The helper script can now be removed.'
