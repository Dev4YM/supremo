### Instructions: Using Windows PowerShell / CMD

* The environment is **Windows 10/11**.
* Prefer **PowerShell** unless a command explicitly requires **CMD**.
* Use **PowerShell-compatible syntax** by default.
* When CMD is required, prefix clearly with `cmd.exe /c`.

#### Command Rules

* Use built-in Windows tools only unless explicitly told otherwise.
* Always use **absolute paths** when modifying files.
* Quote paths containing spaces.
* Avoid interactive prompts; use flags like `-Force`, `-Confirm:$false`, `/y`.
& NEVER use &&, always use ; to separate commands.

#### PowerShell Standards

* Use cmdlets (`Get-ChildItem`, `Copy-Item`, `Remove-Item`) instead of legacy commands when possible.
* Use `|` (pipeline) and `Where-Object`, `ForEach-Object` correctly.
* Use `$env:VAR_NAME` for environment variables.
* Use `-ErrorAction Stop` for scripts that must fail fast.

#### File & Process Handling

* Check existence before delete or overwrite:

  ```powershell
  if (Test-Path "C:\path") { Remove-Item "C:\path" -Recurse -Force }
  ```
* Use `Start-Process` for executables when elevation or arguments are needed.
* Do not assume admin rights unless explicitly stated.

#### Output

* Return **only the command(s)** unless explanation is requested.
* Commands must be **copy-paste safe** and runnable as-is.
