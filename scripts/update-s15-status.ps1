$ErrorActionPreference = 'Stop'

$path = 'docs\IRTH_PROJECT_STATUS.md'
if (-not (Test-Path $path)) {
  throw "Could not find $path. Run this script from the IRTH repository root."
}

$rawContent = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$originalNewLine = if ($rawContent.Contains("`r`n")) { "`r`n" } else { "`n" }
$content = $rawContent.Replace("`r`n", "`n")

function Replace-Section {
  param(
    [int]$Number,
    [int]$NextNumber,
    [string]$Replacement
  )

  $pattern = "(?ms)^# $Number\..*?(?=^# $NextNumber\.)"
  if (-not [regex]::IsMatch($content, $pattern)) {
    throw "Section $Number could not be located."
  }

  $script:content = [regex]::Replace($content, $pattern, $Replacement.TrimStart("`n") + "`n`n---`n`n")
}

$section44 = @'
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
'@
Replace-Section 44 45 $section44

# Remove the now-resolved migration-drift technical debt line without relying on emoji encoding.
$content = [regex]::Replace($content, '(?m)^\* Supabase migration history must be reconciled with Git.*\n?', '')

$section51 = @'
# 51. Recommended First Task

## S15.0 — Database Migration Reconciliation

**Status: CLOSED ✅**

Goal:

Reconcile:

```text
Live Supabase migration history
```

with:

```text
supabase/migrations/
```

inside Git.

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
'@
Replace-Section 51 52 $section51

$section59 = @'
# 59. CURRENT STATUS

```text
LAST CLOSED MAJOR MILESTONE:
S15.0 — Database Migration Reconciliation ✅

CURRENT MAJOR POSITION:
Shopping Foundation

NEXT TASK:
S15.1 — Market & Pricing Foundation
```
'@
Replace-Section 59 60 $section59

$section60 = @'
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
'@
Replace-Section 60 61 $section60

# Add the completion notes once, anchored to the existing final recommendation line.
if ($content -notmatch 'Completed S15\.0 — Database Migration Reconciliation\.') {
  $anchorPattern = '(?m)^(\* Recommended Database Migration Reconciliation as first next task\.)$'
  if (-not [regex]::IsMatch($content, $anchorPattern)) {
    throw 'Change Log anchor could not be located.'
  }

  $addition = @'
$1
* Completed S15.0 — Database Migration Reconciliation.
* Recovered missing Live migration history into Git.
* Reconstructed missing Inventory, Media, RLS helper, and ACL foundations.
* Verified full fresh Local database replay.
* Reconciled Local and Remote migration history.
* Hardened public Product Storage visibility.
* Applied and verified the Storage security hardening on Live Supabase.
* Confirmed S15.1 — Market & Pricing Foundation as the next task.
'@
  $content = [regex]::Replace($content, $anchorPattern, $addition.TrimStart("`n"))
}

if ($originalNewLine -eq "`r`n") {
  $content = $content.Replace("`n", "`r`n")
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)

Write-Host 'IRTH_PROJECT_STATUS.md updated successfully.'
Write-Host 'The helper script can now be removed.'
