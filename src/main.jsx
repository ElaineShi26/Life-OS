import { render } from 'preact'
import { App } from './app'
import { applyTheme, currentTheme } from './store/theme'
import './styles/app.css'

// build-tag: 心情色带增加文字说明
applyTheme(currentTheme())
render(<App />, document.getElementById('app'))
