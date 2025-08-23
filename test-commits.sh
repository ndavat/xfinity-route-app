#!/bin/bash

# Initialize tracking lists
TESTED_COMMITS=()
SKIPPED_COMMITS=()
PUSHED_COMMITS=()

# Get all commit hashes from main branch, oldest to newest
COMMIT_HASHES=$(git log --pretty=format:%H --reverse main)

# Convert string of hashes to an array
readarray -t COMMIT_ARRAY <<< "$COMMIT_HASHES"

# Function to clean dependencies
clean_dependencies() {
    echo "Cleaning dependencies..."
    rm -f package-lock.json
    rm -rf node_modules
    echo "Dependencies cleaned."
}

# Function to install dependencies
install_dependencies() {
    echo "Installing dependencies..."
    if npm install; then
        echo "Dependencies installed successfully."
        return 0
    else
        echo "npm install failed. Attempting npm audit fix..."
        if npm audit fix; then
            echo "npm audit fix successful. Retrying npm install..."
            if npm install; then
                echo "Dependencies installed successfully after audit fix."
                return 0
            else
                echo "npm install failed again after audit fix."
                return 1
            fi
        else
            echo "npm audit fix failed."
            return 1
        fi
    fi
}

# Function to run the app
run_app() {
    echo "Running npm start..."
    npm start &
    NPM_START_PID=$!
    echo "App running for commit $1. Please test functionality. Stop the process when ready."
    echo "Press Enter to stop npm start and continue..."
    read -r
    kill $NPM_START_PID
    wait $NPM_START_PID 2>/dev/null
    echo "npm start stopped."
}

# Main loop
for (( i=0; i<${#COMMIT_ARRAY[@]}; i++ )); do
    CURRENT_COMMIT=${COMMIT_ARRAY[$i]}
    BRANCH_NAME="commit-test-$CURRENT_COMMIT"

    echo "----------------------------------------------------"
    echo "Processing commit: $CURRENT_COMMIT"
    echo "----------------------------------------------------"

    # Checkout commit and create new branch
    git checkout "$CURRENT_COMMIT"
    git checkout -b "$BRANCH_NAME"

    clean_dependencies
    if ! install_dependencies; then
        echo "Dependency installation failed for commit $CURRENT_COMMIT."
        # Error handling for npm install failure
        while true; do
            echo "Choose an action for commit $CURRENT_COMMIT (npm install failed):"
            echo "  (S) Skip commit"
            echo "  (R) Retry process"
            echo "  (C) Commit & push changes (if any manual fixes were made)"
            echo "  (E) End workflow"
            read -r USER_CHOICE
            case "$USER_CHOICE" in
                [Ss]* ) SKIPPED_COMMITS+=("$CURRENT_COMMIT"); break 2 ;; # Break out of inner and outer loop
                [Rr]* ) clean_dependencies; if install_dependencies; then break; else continue; fi ;;
                [Cc]* )
                    git add .
                    git commit -m "Fixes for commit $CURRENT_COMMIT (npm install issue)"
                    git push origin "$BRANCH_NAME"
                    PUSHED_COMMITS+=("$CURRENT_COMMIT")
                    clean_dependencies # Re-clean and re-install to verify push
                    if install_dependencies; then break; else continue; fi
                    ;;
                [Ee]* ) break 3 ;; # Break out of all loops
                * ) echo "Invalid choice. Please try again." ;;
            esac
        done
    fi

    # If we skipped or ended due to install failure, continue to next iteration of outer loop
    if [[ " ${SKIPPED_COMMITS[*]} " =~ " ${CURRENT_COMMIT} " ]]; then
        continue
    fi

    run_app "$CURRENT_COMMIT"

    # User interaction after app run
    while true; do
        echo "Choose an action for commit $CURRENT_COMMIT:"
        echo "  (N) Move to next commit"
        echo "  (S) Skip current commit"
        echo "  (C) Commit and push local changes"
        echo "  (E) End workflow"
        read -r USER_CHOICE
        case "$USER_CHOICE" in
            [Nn]* ) TESTED_COMMITS+=("$CURRENT_COMMIT"); break ;;
            [Ss]* ) SKIPPED_COMMITS+=("$CURRENT_COMMIT"); break ;;
            [Cc]* )
                git add .
                git commit -m "Fixes for commit $CURRENT_COMMIT"
                git push origin "$BRANCH_NAME"
                PUSHED_COMMITS+=("$CURRENT_COMMIT")
                # Restart from step 2 on the same commit (to verify after push)
                clean_dependencies
                if ! install_dependencies; then
                    echo "Re-installation failed after push for commit $CURRENT_COMMIT. Please check manually."
                    # Decide how to handle this: maybe ask user again or force skip/end
                fi
                run_app "$CURRENT_COMMIT"
                ;;
            [Ee]* ) break 2 ;; # Break out of outer loop
            * ) echo "Invalid choice. Please try again." ;;
        esac
    done

    git checkout main # Go back to main before next commit
done

echo "Workflow ended."
echo "Summary:"
echo "Tested commits: ${TESTED_COMMITS[*]}"
echo "Skipped commits: ${SKIPPED_COMMITS[*]}"
echo "Pushed commits: ${PUSHED_COMMITS[*]}"
