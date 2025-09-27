editing this readme from my phone in HomeGoods:

basically this does the following:

- recieves a semantic search, gets most relevent parts from codebase
- uses that as entrypoints into the codebase's function call graph
- using pathfinding between the entrypoints, as well as neighbors N hops away and the inheritance graph, build a context string (access to inheritance graph allows for various levels of detail for context to allow for wide understanding of codebase with mimimal context bloat)

enjoy the rest of the readme, which is certified AI slop tier:

# 🔮 Prism - Code AST Visualizer

A code analysis and visualization tool that extracts Abstract Syntax Trees (AST) from Python code and visualizes them as graphs.

## 🎯 Project Goals

The app is designed to draw graphs about code meta information, including:
- Class inheritance hierarchy
- Functional call graph  
- Abstract syntax tree (AST)

## 🏗️ Architecture

This is a full-stack application with:
- **Backend**: Python Flask server for AST extraction
- **Frontend**: TypeScript Express server serving a web interface
- **Communication**: REST API between backend and frontend

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Build and start the frontend:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📖 Usage

1. Open your browser and go to `http://localhost:3000`
2. Enter Python code in the left textarea
3. Click "Extract AST" to see the Abstract Syntax Tree
4. The AST will be displayed as JSON in the right panel

## 🔧 Development

### Backend Development
- The Flask app provides REST API endpoints
- Main endpoint: `POST /api/ast` - extracts AST from Python code
- Health check: `GET /api/health`

### Frontend Development
- Express server serves a single-page web application
- Built with TypeScript
- Communicates with backend via fetch API

## 📁 Project Structure

```
prism/
├── backend/
│   ├── app.py              # Flask application
│   ├── requirements.txt    # Python dependencies
│   └── .venv/             # Virtual environment
├── frontend/
│   ├── src/
│   │   └── index.ts       # Express server & web interface
│   ├── package.json       # Node.js dependencies
│   ├── tsconfig.json      # TypeScript configuration
│   └── dist/              # Compiled JavaScript
└── README.md              # This file
```

## 🎨 Features

- **AST Extraction**: Parse Python code and extract Abstract Syntax Trees
- **Web Interface**: Beautiful, responsive UI for code input and AST visualization
- **Error Handling**: Graceful error handling for syntax errors and connection issues
- **Real-time Processing**: Instant AST extraction and display

## 🔮 Future Enhancements

- Interactive graph visualization using D3.js or similar
- Support for more programming languages
- Call graph analysis
- Class inheritance hierarchy visualization
- Export capabilities (PNG, SVG, etc.)

## 🤝 Contributing

This is a basic implementation focused on getting the AST → graph visualization pipeline working. The code is designed to be extensible for future features.

## 📝 License

This project is for educational and development purposes. 
