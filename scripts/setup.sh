#!/bin/bash

# Script di setup per lo sviluppo di coordinate-sanitizer
# Autore: Francesco di Biase
# Data: 2025-01-03

set -e  # Exit on any error

echo "Coordinate Sanitizer - Development Setup"
echo "======================================="

# Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Verifica prerequisiti
echo "Checking prerequisites..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js 14.0.0 or higher from https://nodejs.org/"
    exit 1
fi

node_version=$(node -v | cut -d'v' -f2)
required_version="14.0.0"

if ! [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
    echo "Error: Node.js version $node_version is too old. Please upgrade to $required_version or higher."
    exit 1
fi

echo "Node.js version: $node_version ✓"

# npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi

npm_version=$(npm -v)
echo "npm version: $npm_version ✓"

# Git
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed."
    echo "Please install git from https://git-scm.com/"
    exit 1
fi

git_version=$(git --version | cut -d' ' -f3)
echo "git version: $git_version ✓"

# Installa dipendenze
echo ""
echo "Installing dependencies..."
npm install

# Verifica che l'installazione sia andata a buon fine
if [ ! -d "node_modules" ]; then
    echo "Error: Failed to install dependencies."
    exit 1
fi

echo "Dependencies installed ✓"

# Esegui i test per verificare che tutto funzioni
echo ""
echo "Running tests..."
if npm test; then
    echo "Tests passed ✓"
else
    echo "Warning: Some tests failed. Please check the test output."
fi

# Esegui gli esempi
echo ""
echo "Running examples..."
if npm run example > /dev/null 2>&1; then
    echo "Examples ran successfully ✓"
else
    echo "Warning: Examples failed. Please check the examples."
fi

# Verifica la struttura del progetto
echo ""
echo "Verifying project structure..."
required_dirs=("src" "test" "examples")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "Warning: Directory $dir is missing."
    else
        echo "$dir/ ✓"
    fi
done

required_files=("src/index.js" "src/index.d.ts" "test/test.js" "examples/basic-usage.js" "README.md" "LICENSE" "CHANGELOG.md")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Warning: File $file is missing."
    else
        echo "$file ✓"
    fi
done

# Configura Git hooks (opzionale)
echo ""
read -p "Do you want to set up Git hooks for automatic testing? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mkdir -p .git/hooks
    
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook per coordinate-sanitizer

echo "Running pre-commit checks..."

# Esegui i test
if ! npm test; then
    echo "Error: Tests failed. Commit aborted."
    exit 1
fi

echo "Pre-commit checks passed."
EOF
    
    chmod +x .git/hooks/pre-commit
    echo "Git hooks configured ✓"
fi

# Verifica configurazione npm
echo ""
echo "Checking npm configuration..."
if npm whoami > /dev/null 2>&1; then
    npm_user=$(npm whoami)
    echo "npm user: $npm_user ✓"
else
    echo "Warning: Not logged in to npm. Run 'npm login' before publishing."
fi

# Verifica configurazione Git
echo ""
echo "Checking git configuration..."
if git config user.name > /dev/null 2>&1; then
    git_user=$(git config user.name)
    echo "git user: $git_user ✓"
else
    echo "Warning: Git user name not configured. Run 'git config user.name \"Your Name\"'"
fi

if git config user.email > /dev/null 2>&1; then
    git_email=$(git config user.email)
    echo "git email: $git_email ✓"
else
    echo "Warning: Git email not configured. Run 'git config user.email \"your@email.com\"'"
fi

# Suggerimenti per lo sviluppo
echo ""
echo "Development Setup Complete!"
echo "=========================="
echo ""
echo "Available commands:"
echo "  npm test              - Run test suite"
echo "  npm run test:watch    - Run tests in watch mode"
echo "  npm run example       - Run usage examples"
echo "  npm run lint          - Run linter (if configured)"
echo ""
echo "Development workflow:"
echo "  1. Make your changes in src/index.js"
echo "  2. Add tests in test/test.js"
echo "  3. Run 'npm test' to verify"
echo "  4. Update examples if needed"
echo "  5. Update CHANGELOG.md"
echo "  6. Commit and push changes"
echo ""
echo "Publishing workflow:"
echo "  1. Run './scripts/publish.sh' for automated publishing"
echo "  2. Or manually: 'npm version patch/minor/major && npm publish'"
echo ""
echo "Useful resources:"
echo "  - Project README: ./README.md"
echo "  - API Documentation: ./docs/API.md"
echo "  - Examples: ./examples/"
echo "  - Tests: ./test/"
echo ""
echo "Happy coding! 🚀"

# Opzionale: apri l'editor
echo ""
read -p "Do you want to open the project in VS Code? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code .
        echo "VS Code opened ✓"
    else
        echo "VS Code not found. Please open the project manually."
    fi
fi

echo ""
echo "Setup completed successfully!"