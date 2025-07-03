#!/bin/bash

# Script per la pubblicazione del pacchetto coordinate-sanitizer
# Autore: Francesco di Biase
# Data: 2025-01-03

set -e  # Exit on any error

echo "Coordinate Sanitizer - Publication Script"
echo "========================================"

# Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Verifica che sia installato npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in PATH."
    exit 1
fi

# Verifica che sia installato git
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed or not in PATH."
    exit 1
fi

# Verifica che il repository sia pulito
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Git repository is not clean. Please commit or stash changes."
    git status
    exit 1
fi

# Verifica che siamo sul branch main
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    echo "Warning: You are not on the main branch (current: $current_branch)"
    read -p "Do you want to continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Publication cancelled."
        exit 1
    fi
fi

# Mostra versione attuale
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"

# Chiedi il tipo di versione
echo ""
echo "Select version type:"
echo "1. patch (bug fixes)"
echo "2. minor (new features)"
echo "3. major (breaking changes)"
echo "4. custom (specify version)"
echo ""
read -p "Enter your choice (1-4): " version_choice

case $version_choice in
    1)
        version_type="patch"
        ;;
    2)
        version_type="minor"
        ;;
    3)
        version_type="major"
        ;;
    4)
        read -p "Enter custom version (e.g., 1.2.3): " custom_version
        if [[ ! $custom_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Error: Invalid version format. Please use semantic versioning (x.y.z)."
            exit 1
        fi
        version_type=$custom_version
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Pre-publication checks..."
echo "========================"

# Esegui i test
echo "Running tests..."
if ! npm test; then
    echo "Error: Tests failed. Please fix tests before publishing."
    exit 1
fi
echo "Tests passed!"

# Esegui gli esempi per verificare che funzionino
echo "Running examples..."
if ! npm run example > /dev/null 2>&1; then
    echo "Error: Examples failed. Please check examples before publishing."
    exit 1
fi
echo "Examples passed!"

# Verifica che tutti i file necessari siano presenti
echo "Checking required files..."
required_files=("src/index.js" "src/index.d.ts" "README.md" "LICENSE" "CHANGELOG.md")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Error: Required file $file is missing."
        exit 1
    fi
done
echo "All required files present!"

# Verifica il package.json
echo "Validating package.json..."
if ! npm run lint > /dev/null 2>&1; then
    echo "Warning: Linting issues found (continuing anyway)."
fi

# Aggiorna la versione
echo ""
echo "Updating version..."
if [[ $version_type =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    npm version $version_type --no-git-tag-version
    new_version=$version_type
else
    npm version $version_type --no-git-tag-version
    new_version=$(node -p "require('./package.json').version")
fi

echo "Version updated to: $new_version"

# Aggiorna il CHANGELOG
echo "Updating CHANGELOG.md..."
changelog_date=$(date +%Y-%m-%d)
if grep -q "## \[Unreleased\]" CHANGELOG.md; then
    sed -i.bak "s/## \[Unreleased\]/## [$new_version] - $changelog_date/" CHANGELOG.md
    rm CHANGELOG.md.bak 2>/dev/null || true
fi

# Commit delle modifiche
echo "Committing changes..."
git add package.json CHANGELOG.md
git commit -m "Release version $new_version"

# Crea il tag
echo "Creating git tag..."
git tag -a "v$new_version" -m "Release version $new_version"

# Conferma finale
echo ""
echo "Ready to publish version $new_version"
echo "Changes:"
echo "- Version: $current_version -> $new_version"
echo "- Git tag: v$new_version created"
echo "- CHANGELOG.md updated"
echo ""
read -p "Are you sure you want to publish to npm? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Publication cancelled."
    echo "Rolling back changes..."
    git reset --hard HEAD~1
    git tag -d "v$new_version"
    npm version $current_version --no-git-tag-version
    echo "Changes rolled back."
    exit 1
fi

# Pubblica su npm
echo "Publishing to npm..."
if npm publish; then
    echo "Successfully published to npm!"
else
    echo "Error: Failed to publish to npm."
    echo "Rolling back changes..."
    git reset --hard HEAD~1
    git tag -d "v$new_version"
    npm version $current_version --no-git-tag-version
    exit 1
fi

# Push su GitHub
echo "Pushing to GitHub..."
git push origin main
git push origin "v$new_version"

echo ""
echo "Publication completed successfully!"
echo "=================================="
echo "Version: $new_version"
echo "npm: https://www.npmjs.com/package/coordinate-sanitizer"
echo "GitHub: https://github.com/Francescodib/coordinate-sanitizer"
echo "Tag: https://github.com/Francescodib/coordinate-sanitizer/releases/tag/v$new_version"
echo ""
echo "Next steps:"
echo "1. Create a release on GitHub: https://github.com/Francescodib/coordinate-sanitizer/releases/new"
echo "2. Update documentation if needed"
echo "3. Announce the release"
echo ""
echo "Thank you for using coordinate-sanitizer!"