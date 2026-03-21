import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DiscoverPage from './pages/DiscoverPage'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
      </Routes>
    </BrowserRouter>
  )
}
