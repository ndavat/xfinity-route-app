# Initialize tracking lists
$TESTED_COMMITS = @()
$SKIPPED_COMMITS = @()
$PUSHED_COMMITS = @()

# Get all commit hashes from main branch, oldest to newest
$COMMIT_HASHES = (git log --pretty=format:%H --reverse main) -split "`n" | Where-Object { $_ }

# Function to clean dependencies
function Clean-Dependencies {
    Write-Host "Cleaning dependencies..."
    Remove-Item -Path package-lock.json -ErrorAction SilentlyContinue
    Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Dependencies cleaned."
}

# Function to install dependencies
function Install-Dependencies {
    Write-Host "Installing dependencies..."
    try {
        npm install | Out-Null
        Write-Host "Dependencies installed successfully."
        return $true
    } catch {
        Write-Host "npm install failed. Attempting npm audit fix..."
        try {
            npm audit fix | Out-Null
            Write-Host "npm audit fix successful. Retrying npm install..."
            try {
                npm install | Out-Null
                Write-Host "Dependencies installed successfully after audit fix."
                return $true
            } catch {
                Write-Host "npm install failed again after audit fix."
                return $false
            }
        } catch {
            Write-Host "npm audit fix failed."
            return $false
        }
    }
}

# Function to run the app
function Run-App {
    param (
        [string]$CommitHash
    )
    Write-Host "Running npm start..."
    $NPM_START_PROCESS = Start-Process npm -ArgumentList "start" -PassThru -NoNewWindow
    $NPM_START_PID = $NPM_START_PROCESS.Id
    Write-Host "App running for commit $CommitHash. Please test functionality. Stop the process when ready."
    Write-Host "Press Enter to stop npm start and continue..."
    [void]$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") # Wait for any key press
    
    # Stop the npm start process
    Stop-Process -Id $NPM_START_PID -Force -ErrorAction SilentlyContinue
    Write-Host "npm start stopped."
}

# Main loop
for ($i = 0; $i -lt $COMMIT_HASHES.Count; $i++) {
    $CURRENT_COMMIT = $COMMIT_HASHES[$i]
    $BRANCH_NAME = "commit-test-$CURRENT_COMMIT"
    $ContinueOuterLoop = $false

    Write-Host "----------------------------------------------------"
    Write-Host "Processing commit: $CURRENT_COMMIT"
    Write-Host "----------------------------------------------------"

    # Checkout commit and create new branch
    git checkout "$CURRENT_COMMIT"
    git checkout -b "$BRANCH_NAME"

    Clean-Dependencies
    if (-not (Install-Dependencies)) {
        Write-Host "Dependency installation failed for commit $CURRENT_COMMIT."
        # Error handling for npm install failure
        while ($true) {
            Write-Host "Choose an action for commit $CURRENT_COMMIT (npm install failed):"
            Write-Host "  (S) Skip commit"
            Write-Host "  (R) Retry process"
            Write-Host "  (C) Commit & push changes (if any manual fixes were made)"
            Write-Host "  (E) End workflow"
            $USER_CHOICE = Read-Host "Your choice"
            switch ($USER_CHOICE.ToLower()) {
                "s" { $SKIPPED_COMMITS += $CURRENT_COMMIT; $ContinueOuterLoop = $true; break }
                "r" { Clean-Dependencies; if (Install-Dependencies) { break } else { continue } }
                "c" {
                    git add .
                    git commit -m "Fixes for commit $CURRENT_COMMIT (npm install issue)"
                    git push origin "$BRANCH_NAME"
                    $PUSHED_COMMITS += $CURRENT_COMMIT
                    Clean-Dependencies # Re-clean and re-install to verify push
                    if (Install-Dependencies) { break } else { continue }
                }
                "e" { $i = $COMMIT_HASHES.Count; $ContinueOuterLoop = $true; break } # End workflow
                default { Write-Host "Invalid choice. Please try again." }
            }
            if ($ContinueOuterLoop) { break }
        }
    }

    # If we skipped or ended due to install failure, continue to next iteration of outer loop
    if ($ContinueOuterLoop) {
        git checkout main # Go back to main before next commit
        continue
    }

    Run-App -CommitHash "$CURRENT_COMMIT"

    # User interaction after app run
    while ($true) {
        Write-Host "Choose an action for commit ${CURRENT_COMMIT}:"
        Write-Host "  (N) Move to next commit"
        Write-Host "  (S) Skip current commit"
        Write-Host "  (C) Commit and push local changes"
        Write-Host "  (E) End workflow"
        $USER_CHOICE = Read-Host "Your choice"
        switch ($USER_CHOICE.ToLower()) {
            "n" { $TESTED_COMMITS += $CURRENT_COMMIT; break }
            "s" { $SKIPPED_COMMITS += $CURRENT_COMMIT; break }
            "c" {
                git add .
                git commit -m "Fixes for commit $CURRENT_COMMIT"
                git push origin "$BRANCH_NAME"
                $PUSHED_COMMITS += $CURRENT_COMMIT
                # Restart from step 2 on the same commit (to verify after push)
                Clean-Dependencies
                if (-not (Install-Dependencies)) {
                    Write-Host "Re-installation failed after push for commit $CURRENT_COMMIT. Please check manually."
                    # Decide how to handle this: maybe ask user again or force skip/end
                }
                Run-App -CommitHash "$CURRENT_COMMIT"
            }
            "e" { $i = $COMMIT_HASHES.Count; break } # End workflow
            default { Write-Host "Invalid choice. Please try again." }
        }
    }

    git checkout main # Go back to main before next commit
}

Write-Host "Workflow ended."
Write-Host "Summary:"
Write-Host "Tested commits: $($TESTED_COMMITS -join ', ')"
Write-Host "Skipped commits: $($SKIPPED_COMMITS -join ', ')"
Write-Host "Pushed commits: $($PUSHED_COMMITS -join ', ')"