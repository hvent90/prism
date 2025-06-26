import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

const defaultCode = `def helper_function():
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

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  height?: string;
  options?: any;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'python',
  theme = 'vs-dark',
  height = '100%',
  options = {},
  className = '',
}) => {
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Use defaultCode if value is empty or undefined
  const editorValue = value || defaultCode;
  
  // Initialize with default code if the value is empty on first render
  useEffect(() => {
    if (!value && onChange) {
      onChange(defaultCode);
    }
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsReady(true);

    // Configure Python language features
    monaco.languages.setLanguageConfiguration('python', {
      brackets: [
        ['(', ')'],
        ['[', ']'],
        ['{', '}'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /^\s*(def|class|if|elif|else|for|while|with|try|except|finally|async def).*:$/,
        decreaseIndentPattern: /^\s*(return|pass|break|continue|raise).*$/,
      },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // This will be handled by the parent component
      const event = new CustomEvent('analyzeCode');
      document.dispatchEvent(event);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      onChange('');
    });
  };

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  const defaultOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 20,
    tabSize: 4,
    insertSpaces: true,
    folding: true,
    lineNumbers: 'on',
    glyphMargin: true,
    ...options,
  };

  return (
    <div className={`code-editor-wrapper ${className}`}>
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={editorValue}
        options={defaultOptions}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        loading={<div className="editor-loading">Loading editor...</div>}
      />
    </div>
  );
}; 