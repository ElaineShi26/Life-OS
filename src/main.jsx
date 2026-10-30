import { render } from 'preact'
import { App } from './app'
import { applyTheme, currentTheme } from './store/theme'
import './styles/app.css'

applyTheme(currentTheme())
render(<App />, document.getElementById('app'))
