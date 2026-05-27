const THEME_ID = 'jsonife-dark'

type MonacoApi = {
  editor: {
    defineTheme: (themeName: string, themeData: object) => void
  }
}

export function defineJsonifeTheme(monaco: MonacoApi): void {
  monaco.editor.defineTheme(THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string', foreground: 'b8ff3c' },
      { token: 'number', foreground: '00e5ff' },
      { token: 'keyword', foreground: '00e5ff' },
      { token: 'operator', foreground: '8fa8c4' },
      { token: 'delimiter', foreground: '8fa8c4' },
      { token: 'comment', foreground: '5a6d82', fontStyle: 'italic' }
    ],
    colors: {
      'editor.background': '#0a0e14',
      'editor.foreground': '#e4eaf0',
      'editor.lineHighlightBackground': '#111820',
      'editor.selectionBackground': '#00e5ff33',
      'editor.inactiveSelectionBackground': '#00e5ff1a',
      'editorCursor.foreground': '#00e5ff',
      'editorLineNumber.foreground': '#4a5d73',
      'editorLineNumber.activeForeground': '#00e5ff',
      'editorIndentGuide.background': '#1e2a38',
      'editorIndentGuide.activeBackground': '#2a3d52',
      'editorWidget.background': '#111820',
      'editorWidget.border': '#1e2a38',
      'scrollbarSlider.background': '#1e2a3888',
      'scrollbarSlider.hoverBackground': '#2a3d52aa'
    }
  })
}

export function getJsonifeThemeId(): string {
  return THEME_ID
}
