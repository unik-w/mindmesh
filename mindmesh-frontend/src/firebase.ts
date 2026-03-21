import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBjx49lP9iShCypJgG_7qq0f5PjLuunWE8',
  authDomain: 'mindmeshresearcher.firebaseapp.com',
  projectId: 'mindmeshresearcher',
  storageBucket: 'mindmeshresearcher.firebasestorage.app',
  messagingSenderId: '133395813506',
  appId: '1:133395813506:web:31eb5a03a2673df481d09b',
  measurementId: 'G-LLX2HVDDVE',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)

void isSupported().then((yes) => {
  if (yes) getAnalytics(firebaseApp)
})
