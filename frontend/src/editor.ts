// Enhanced Code Editor with Monaco Editor integration
declare const monaco: any;

export class CodeEditor {
    private editor: any;
    private containerId: string;
    private dashboard: any;

    constructor(containerId: string) {
        this.containerId = containerId;
        this.initializeEditor();
    }

    private initializeEditor(): void {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        // Wait for Monaco to be available
        this.waitForMonaco().then(() => {
            this.createEditor();
        });
    }

    private waitForMonaco(): Promise<void> {
        return new Promise((resolve) => {
            const checkMonaco = () => {
                if (typeof monaco !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkMonaco, 100);
                }
            };
            checkMonaco();
        });
    }

    private createEditor(): void {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        this.editor = monaco.editor.create(container, {
            value: this.getDefaultCode(),
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            wordWrap: 'on',
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            lineHeight: 20,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            renderWhitespace: 'selection',
            rulers: [79, 100],
            cursorStyle: 'line',
            cursorBlinking: 'blink',
            multiCursorModifier: 'ctrlCmd',
            contextmenu: true,
            mouseWheelZoom: true,
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            accessibilitySupport: 'auto',
            autoIndent: 'advanced',
            formatOnPaste: true,
            formatOnType: true,
            renderLineHighlight: 'all',
            selectionHighlight: true,
            smoothScrolling: true,
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: true,
            wordSeparators: '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?',
            wordWrapColumn: 80,
            wrappingIndent: 'indent',
            wrappingStrategy: 'advanced'
        });

        // Setup event listeners
        this.setupEventListeners();

        // Apply custom Python configurations
        this.configurePythonLanguage();
    }

    private setupEventListeners(): void {
        if (!this.editor) return;

        // Content change handler
        this.editor.onDidChangeModelContent(() => {
            this.updateLineCount();
            this.autoSave();
            this.debounceAnalysis();
        });

        // Selection change handler
        this.editor.onDidChangeCursorSelection((e: any) => {
            this.updateCursorInfo(e);
        });

        // Focus handler
        this.editor.onDidFocusEditorWidget(() => {
            document.body.classList.add('editor-focused');
        });

        // Blur handler
        this.editor.onDidBlurEditorWidget(() => {
            document.body.classList.remove('editor-focused');
        });

        // Custom commands
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
            this.commentLines();
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
            this.uncommentLines();
        });
    }

    private configurePythonLanguage(): void {
        if (!monaco.languages) return;

        // Enhanced Python syntax highlighting
        monaco.languages.setMonarchTokensProvider('python', {
            keywords: [
                'and', 'as', 'assert', 'break', 'class', 'continue', 'def',
                'del', 'elif', 'else', 'except', 'exec', 'finally', 'for',
                'from', 'global', 'if', 'import', 'in', 'is', 'lambda',
                'not', 'or', 'pass', 'print', 'raise', 'return', 'try',
                'while', 'with', 'yield', 'async', 'await', 'nonlocal'
            ],
            typeKeywords: [
                'bool', 'int', 'float', 'str', 'list', 'dict', 'tuple',
                'set', 'frozenset', 'bytes', 'bytearray', 'memoryview',
                'object', 'type', 'None', 'True', 'False'
            ],
            operators: [
                '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
                '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^',
                '%', '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
                '^=', '%=', '<<=', '>>=', '>>>='
            ],
            symbols: /[=><!~?:&|+\-*\/\^%]+/,
            tokenizer: {
                root: [
                    [/[a-zA-Z_$][\w$]*/, {
                        cases: {
                            '@typeKeywords': 'keyword',
                            '@keywords': 'keyword',
                            '@default': 'identifier'
                        }
                    }],
                    [/[ \t\r\n]+/, 'white'],
                    [/#.*$/, 'comment'],
                    [/".*?"/, 'string'],
                    [/'.*?'/, 'string'],
                    [/\d+/, 'number'],
                    [/[;,.]/, 'delimiter'],
                    [/[(){}[\]]/, '@brackets'],
                    [/@symbols/, {
                        cases: {
                            '@operators': 'operator',
                            '@default': ''
                        }
                    }]
                ]
            }
        });

        // Code completion provider
        monaco.languages.registerCompletionItemProvider('python', {
            provideCompletionItems: (model: any, position: any) => {
                const suggestions = [
                    {
                        label: 'def',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'def ${1:function_name}(${2:parameters}):\n    ${3:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Function definition'
                    },
                    {
                        label: 'class',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, parameters}):\n        ${3:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Class definition'
                    },
                    {
                        label: 'if',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'if ${1:condition}:\n    ${2:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If statement'
                    },
                    {
                        label: 'for',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop'
                    },
                    {
                        label: 'try',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try-except block'
                    }
                ];

                return { suggestions };
            }
        });
    }

    private getDefaultCode(): string {
        return `def helper_function():
    return "Helper result"

def process_data(data):
    result = helper_function()
    return validate_data(result)

class Food:
    def __init__(self, name, food_type, calories):
        self.name = name
        self.food_type = food_type  # 'meat', 'plant', 'treats'
        self.calories = calories
        self.is_consumed = False
    
    def get_nutrition_info(self):
        return {
            'name': self.name,
            'type': self.food_type,
            'calories': self.calories
        }
    
    def consume(self):
        if not self.is_consumed:
            self.is_consumed = True
            return f"{self.name} has been consumed"
        return f"{self.name} is already consumed"

class Animal:
    def __init__(self, name):
        self.name = name
        self.energy = 50
        self.foods_eaten = []

    def speak(self):
        pass
    
    def eat(self, food):
        if not isinstance(food, Food):
            return f"{self.name} cannot eat {food}"
        
        if food.is_consumed:
            return f"{self.name} tried to eat {food.name}, but it's already gone!"
        
        nutrition = food.get_nutrition_info()
        consumption_result = food.consume()
        
        self.energy += nutrition['calories']
        self.foods_eaten.append(nutrition)
        
        return f"{self.name} ate {food.name} and gained {nutrition['calories']} energy!"
    
    def get_status(self):
        return {
            'name': self.name,
            'energy': self.energy,
            'meals_count': len(self.foods_eaten),
            'last_meal': self.foods_eaten[-1]['name'] if self.foods_eaten else 'None'
        }

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"
    
    def eat(self, food):
        # Dogs have preferences - they love treats!
        base_result = super().eat(food)
        if isinstance(food, Food) and food.food_type == 'treats':
            return base_result + " *tail wagging intensifies*"
        return base_result

class Cat(Animal):
    def speak(self):
        return f"{self.name} says Meow!"
    
    def eat(self, food):
        # Cats are picky eaters
        if isinstance(food, Food) and food.food_type == 'plant':
            return f"{self.name} sniffs {food.name} disdainfully and walks away"
        return super().eat(food)

# Create food objects
kibble = Food("Dog Kibble", "meat", 30)
salmon = Food("Fresh Salmon", "meat", 45)
catnip_treats = Food("Catnip Treats", "treats", 15)
lettuce = Food("Lettuce", "plant", 5)

# Create animals
my_dog = Dog("Buddy")
my_cat = Cat("Whiskers")

# Demonstrate cross-object interactions
my_dog.speak()
my_dog.eat(kibble)
my_dog.eat(catnip_treats)

my_cat.speak()
my_cat.eat(salmon)
my_cat.eat(lettuce)  # Cat won't eat this!

# Check animal status after interactions
my_dog.get_status()
my_cat.get_status()

# Try to feed already consumed food
my_dog.eat(kibble)`;
    }

    private updateLineCount(): void {
        if (!this.editor) return;
        
        const lineCount = this.editor.getModel()?.getLineCount() || 0;
        
        // Update dashboard if available
        if ((window as any).prismDashboard) {
            (window as any).prismDashboard.updateLineCount(lineCount);
        }
    }

    private updateCursorInfo(e: any): void {
        if (!e.selection) return;
        
        const line = e.selection.startLineNumber;
        const column = e.selection.startColumn;
        
        // Could show cursor position in status bar
        console.debug(`Cursor at line ${line}, column ${column}`);
    }

    private autoSave(): void {
        const code = this.getValue();
        localStorage.setItem('prism-code', code);
    }

    private debounceAnalysis(): void {
        // Clear existing timeout
        if ((this as any).analysisTimeout) {
            clearTimeout((this as any).analysisTimeout);
        }

        // Set new timeout for auto-analysis
        (this as any).analysisTimeout = setTimeout(() => {
            // Auto-analyze could be implemented here if desired
            // For now, we'll keep manual analysis only
        }, 2000);
    }

    private commentLines(): void {
        const selection = this.editor.getSelection();
        const model = this.editor.getModel();
        
        if (!selection || !model) return;

        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;

        for (let line = startLine; line <= endLine; line++) {
            const lineContent = model.getLineContent(line);
            const newContent = lineContent.startsWith('#') ? lineContent : `# ${lineContent}`;
            
            model.pushEditOperations(
                [],
                [{
                    range: new monaco.Range(line, 1, line, lineContent.length + 1),
                    text: newContent
                }],
                () => null
            );
        }
    }

    private uncommentLines(): void {
        const selection = this.editor.getSelection();
        const model = this.editor.getModel();
        
        if (!selection || !model) return;

        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;

        for (let line = startLine; line <= endLine; line++) {
            const lineContent = model.getLineContent(line);
            const newContent = lineContent.replace(/^#\s?/, '');
            
            if (newContent !== lineContent) {
                model.pushEditOperations(
                    [],
                    [{
                        range: new monaco.Range(line, 1, line, lineContent.length + 1),
                        text: newContent
                    }],
                    () => null
                );
            }
        }
    }

    // Public API methods
    public getValue(): string {
        return this.editor ? this.editor.getValue() : '';
    }

    public setValue(code: string): void {
        if (this.editor) {
            this.editor.setValue(code);
        }
    }

    public layout(): void {
        if (this.editor) {
            this.editor.layout();
        }
    }

    public focus(): void {
        if (this.editor) {
            this.editor.focus();
        }
    }

    public getSelection(): any {
        return this.editor ? this.editor.getSelection() : null;
    }

    public setSelection(selection: any): void {
        if (this.editor && selection) {
            this.editor.setSelection(selection);
        }
    }

    public insertText(text: string): void {
        if (this.editor) {
            const selection = this.editor.getSelection();
            this.editor.executeEdits('', [{
                range: selection,
                text: text
            }]);
        }
    }

    public dispose(): void {
        if (this.editor) {
            this.editor.dispose();
        }
    }
} 