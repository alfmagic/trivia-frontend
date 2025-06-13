import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { CheckCircle, XCircle, RotateCcw, Trophy, Loader2, Users, Share2, Copy, Sparkles, Home, Play, Settings } from 'lucide-react'
import './App.css'

const API_BASE_URL = 'https://trivia-backend-odlc.onrender.com'; // Apunta a mi backend de prueba

// Categorías disponibles en Open Trivia Database
const CATEGORIES = [
  { id: '', name: 'Any Category' },
  { id: '9', name: 'General Knowledge' },
  { id: '10', name: 'Entertainment: Books' },
  { id: '11', name: 'Entertainment: Film' },
  { id: '12', name: 'Entertainment: Music' },
  { id: '13', name: 'Entertainment: Musicals & Theatres' },
  { id: '14', name: 'Entertainment: Television' },
  { id: '15', name: 'Entertainment: Video Games' },
  { id: '16', name: 'Entertainment: Board Games' },
  { id: '17', name: 'Science & Nature' },
  { id: '18', name: 'Science: Computers' },
  { id: '19', name: 'Science: Mathematics' },
  { id: '20', name: 'Mythology' },
  { id: '21', name: 'Sports' },
  { id: '22', name: 'Geography' },
  { id: '23', name: 'History' },
  { id: '24', name: 'Politics' },
  { id: '25', name: 'Art' },
  { id: '26', name: 'Celebrities' },
  { id: '27', name: 'Animals' },
  { id: '28', name: 'Vehicles' },
  { id: '29', name: 'Entertainment: Comics' },
  { id: '30', name: 'Science: Gadgets' },
  { id: '31', name: 'Entertainment: Japanese Anime & Manga' },
  { id: '32', name: 'Entertainment: Cartoon & Animations' }
];

const DIFFICULTIES = [
  { value: '', label: 'Any Difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

const QUESTION_AMOUNTS = [
  { value: 5, label: '5 Questions' },
  { value: 10, label: '10 Questions' },
  { value: 15, label: '15 Questions' },
  { value: 20, label: '20 Questions' },
  { value: 25, label: '25 Questions' }
];

// Lista de nombres de animales aleatorios
const ANIMAL_NAMES = [
  'Brave Lion', 'Clever Fox', 'Swift Eagle', 'Wise Owl', 'Strong Bear',
  'Graceful Swan', 'Mighty Tiger', 'Gentle Deer', 'Playful Dolphin', 'Noble Wolf',
  'Curious Cat', 'Happy Penguin', 'Fierce Hawk', 'Calm Turtle', 'Energetic Rabbit',
  'Majestic Elephant', 'Sneaky Panther', 'Friendly Dog', 'Wild Horse', 'Clever Monkey',
  'Colorful Parrot', 'Fast Cheetah', 'Proud Peacock', 'Loyal Husky', 'Funny Koala',
  'Brave Shark', 'Cute Panda', 'Smart Raven', 'Free Bird', 'Cool Penguin'
];

// Función para obtener un nombre de animal aleatorio
const getRandomAnimalName = () => {
  return ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
};

function App() {
  const [gameMode, setGameMode] = useState('menu') // 'menu', 'single', 'multiplayer', 'settings'
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [gameSettings, setGameSettings] = useState({
    difficulty: '',
    category: '',
    amount: 10
  })
  const [gameState, setGameState] = useState({
    roomId: null,
    playerId: null,
    currentQuestion: null,
    questionNumber: 0,
    players: [],
    isHost: false
  })
  
  // Estados para modo single player
  const [preguntaActual, setPreguntaActual] = useState(null)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null)
  const [puntuacion, setPuntuacion] = useState(0)
  const [totalPreguntas, setTotalPreguntas] = useState(0)
  const [mostrarResultado, setMostrarResultado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [sessionToken, setSessionToken] = useState(null)

  // Función para obtener parámetros de la URL
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      room: urlParams.get('room')
    };
  };

  // Efecto para manejar enlaces compartidos
  useEffect(() => {
    const params = getUrlParams();
    if (params.room) {
      setRoomCode(params.room.toUpperCase());
      // Limpiar la URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Función para decodificar entidades HTML
  const decodificarHTML = (texto) => {
    return texto
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  };

  // Función para obtener un token de sesión (modo single player)
  const obtenerSessionToken = async () => {
    try {
      const response = await fetch('https://opentdb.com/api_token.php?command=request');
      const data = await response.json();
      if (data.response_code === 0) {
        setSessionToken(data.token);
        return data.token;
      }
    } catch (error) {
      console.error('Error obteniendo session token:', error);
    }
    return null;
  };

  // Función para cargar una nueva pregunta (modo single player)
  const cargarNuevaPregunta = async () => {
    setCargando(true);
    try {
      let token = sessionToken;
      if (!token) {
        token = await obtenerSessionToken();
      }

      let url = 'https://opentdb.com/api.php?amount=1&type=multiple';
      if (token) url += `&token=${token}`;
      if (gameSettings.difficulty) url += `&difficulty=${gameSettings.difficulty}`;
      if (gameSettings.category) url += `&category=${gameSettings.category}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.response_code === 0 && data.results.length > 0) {
        const pregunta = data.results[0];
        
        const preguntaFormateada = {
          question: decodificarHTML(pregunta.question),
          options: [
            decodificarHTML(pregunta.correct_answer),
            ...pregunta.incorrect_answers.map(answer => decodificarHTML(answer))
          ].sort(() => Math.random() - 0.5),
          correct_answer: null,
          category: pregunta.category,
          difficulty: pregunta.difficulty
        };

        const respuestaCorrectaTexto = decodificarHTML(pregunta.correct_answer);
        preguntaFormateada.correct_answer = preguntaFormateada.options.findIndex(
          opcion => opcion === respuestaCorrectaTexto
        );

        setPreguntaActual(preguntaFormateada);
      } else if (data.response_code === 4) {
        if (token) {
          await fetch(`https://opentdb.com/api_token.php?command=reset&token=${token}`);
          cargarNuevaPregunta();
        }
      }
    } catch (error) {
      console.error('Error cargando pregunta:', error);
    }
    setCargando(false);
  };

  // Funciones para modo multijugador
  const createRoom = async () => {
    const finalPlayerName = playerName.trim() || getRandomAnimalName();
    
    setCargando(true);
    try {
      // Primero, verificar conectividad básica
      const healthCheck = await fetch(`${API_BASE_URL.replace('/api/game', '')}/`, {
        method: 'GET',
        mode: 'cors'
      }).catch(() => null);
      
      if (!healthCheck) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // Aumentar a 20 segundos
      
      const response = await fetch(`${API_BASE_URL}/create-room`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          player_name: finalPlayerName,
          settings: gameSettings
        }),
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      setGameState({
        roomId: data.room_id,
        playerId: data.player_id,
        currentQuestion: null,
        questionNumber: 0,
        players: [],
        isHost: true
      });
      setRoomCode(data.room_code);
      setPlayerName(finalPlayerName);
      setGameMode('multiplayer');
      
      // Iniciar polling después de un breve delay
      setTimeout(() => {
        pollRoomStatus(data.room_id);
      }, 1000);
      
    } catch (error) {
      console.error('Error creating room:', error);
      let errorMessage = 'Error creating room. ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('Cannot connect')) {
        errorMessage += 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    }
    setCargando(false);
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }
    
    const finalPlayerName = playerName.trim() || getRandomAnimalName();
    
    setCargando(true);
    try {
      // Primero, verificar conectividad básica
      const healthCheck = await fetch(`${API_BASE_URL.replace('/api/game', '')}/`, {
        method: 'GET',
        mode: 'cors'
      }).catch(() => null);
      
      if (!healthCheck) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // Aumentar a 20 segundos
      
      const response = await fetch(`${API_BASE_URL}/join-room`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          room_code: roomCode.toUpperCase(), 
          player_name: finalPlayerName 
        }),
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      setGameState({
        roomId: data.room_id,
        playerId: data.player_id,
        currentQuestion: null,
        questionNumber: 0,
        players: [],
        isHost: false
      });
      setPlayerName(finalPlayerName);
      setGameMode('multiplayer');
      
      // Iniciar polling después de un breve delay
      setTimeout(() => {
        pollRoomStatus(data.room_id);
      }, 1000);
      
    } catch (error) {
      console.error('Error joining room:', error);
      let errorMessage = 'Error joining room. ';
      
      if (error.name === 'AbortError') {
        errorMessage += 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('Cannot connect')) {
        errorMessage += 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage += error.message || 'Please check the room code and try again.';
      }
      
      alert(errorMessage);
    }
    setCargando(false);
  };

  const startNextQuestion = async () => {
    if (!gameState.roomId) return;
    
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/room/${gameState.roomId}/next-question`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (response.ok) {
        setGameState(prev => ({
          ...prev,
          currentQuestion: data.question,
          questionNumber: data.question_number
        }));
        setRespuestaSeleccionada(null);
        setMostrarResultado(false);
      } else {
        console.error('Error starting next question:', data.error);
      }
    } catch (error) {
      console.error('Error starting next question:', error);
    }
    setCargando(false);
  };

  const submitMultiplayerAnswer = async (answerIndex) => {
    if (!gameState.playerId || respuestaSeleccionada !== null) return;
    
    setRespuestaSeleccionada(answerIndex);
    
    try {
      const response = await fetch(`${API_BASE_URL}/player/${gameState.playerId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerIndex })
      });
      
      const data = await response.json();
      if (response.ok) {
        setMostrarResultado(true);
        // Actualizar estado de la sala
        pollRoomStatus(gameState.roomId);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const pollRoomStatus = async (roomId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/room/${roomId}/status?player_id=${gameState.playerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Room status error:', data.error);
        if (data.error.includes('not found') || data.error.includes('inactive')) {
          // Sala no encontrada o inactiva, volver al menú
          setGameMode('menu');
          alert('Room is no longer active. Returning to menu.');
        }
        return;
      }
      
      setGameState(prev => ({
        ...prev,
        currentQuestion: data.current_question,
        questionNumber: data.question_number,
        players: data.players || []
      }));
      
    } catch (error) {
      console.error('Error polling room status:', error);
      // No mostrar error al usuario para evitar spam, solo loggear
    }
  };

  // Polling para actualizar estado de la sala
  useEffect(() => {
    if (gameMode === 'multiplayer' && gameState.roomId) {
      const interval = setInterval(() => {
        pollRoomStatus(gameState.roomId);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [gameMode, gameState.roomId]);

  // Cargar primera pregunta en modo single player
  useEffect(() => {
    if (gameMode === 'single') {
      cargarNuevaPregunta();
    }
  }, [gameMode]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    alert('Room code copied to clipboard!');
  };

  const shareRoom = () => {
    const shareUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Room link copied to clipboard!');
  };

  const backToMenu = () => {
    setGameMode('menu');
    setPreguntaActual(null);
    setRespuestaSeleccionada(null);
    setPuntuacion(0);
    setTotalPreguntas(0);
    setMostrarResultado(false);
    setGameState({
      roomId: null,
      playerId: null,
      currentQuestion: null,
      questionNumber: 0,
      players: [],
      isHost: false
    });
    // No limpiar playerName y roomCode para facilitar reconexión
  };

  // Funciones para modo single player
  const manejarSeleccionRespuesta = (indice) => {
    if (gameMode === 'multiplayer') {
      submitMultiplayerAnswer(indice);
      return;
    }
    
    if (respuestaSeleccionada !== null) return;
    setRespuestaSeleccionada(indice);
    setMostrarResultado(true);
    setTotalPreguntas(totalPreguntas + 1);
    
    if (indice === preguntaActual.correct_answer) {
      setPuntuacion(puntuacion + 1);
    }
  };

  const siguientePregunta = () => {
    if (gameMode === 'multiplayer') {
      if (gameState.isHost) {
        startNextQuestion();
      }
      return;
    }
    
    setRespuestaSeleccionada(null);
    setMostrarResultado(false);
    cargarNuevaPregunta();
  };

  const reiniciarJuego = () => {
    if (gameMode === 'multiplayer') {
      backToMenu();
      return;
    }
    
    setPuntuacion(0);
    setTotalPreguntas(0);
    setRespuestaSeleccionada(null);
    setMostrarResultado(false);
    cargarNuevaPregunta();
  };

  const obtenerColorBoton = (indice) => {
    if (!mostrarResultado) {
      return respuestaSeleccionada === indice 
        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-500 shadow-lg shadow-purple-500/25' 
        : 'bg-gray-800/50 text-gray-100 border-gray-600 hover:bg-gray-700/70 hover:border-gray-500 transition-all duration-300';
    }
    
    const currentQ = gameMode === 'multiplayer' ? gameState.currentQuestion : preguntaActual;
    if (indice === currentQ.correct_answer) {
      return 'bg-gradient-to-r from-emerald-600 to-green-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/25';
    }
    
    if (indice === respuestaSeleccionada && indice !== currentQ.correct_answer) {
      return 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-lg shadow-red-500/25';
    }
    
    return 'bg-gray-800/30 text-gray-400 border-gray-700';
  };

  const obtenerIcono = (indice) => {
    if (!mostrarResultado) return null;
    
    const currentQ = gameMode === 'multiplayer' ? gameState.currentQuestion : preguntaActual;
    if (indice === currentQ.correct_answer) {
      return <CheckCircle className="w-5 h-5 ml-2" />;
    }
    
    if (indice === respuestaSeleccionada && indice !== currentQ.correct_answer) {
      return <XCircle className="w-5 h-5 ml-2" />;
    }
    
    return null;
  };

  // Pantalla de configuración
  if (gameMode === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-black"></div>
        <Card className="w-full max-w-md relative z-10 bg-gray-900/80 backdrop-blur-xl border-gray-700 shadow-2xl shadow-purple-500/10">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <Settings className="w-8 h-8 text-purple-400 mr-2" />
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Game Settings
              </CardTitle>
            </div>
            <p className="text-gray-400 text-lg">Customize your trivia experience</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Difficulty</label>
                <Select value={gameSettings.difficulty} onValueChange={(value) => setGameSettings(prev => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger className="w-full bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {DIFFICULTIES.map(diff => (
                      <SelectItem key={diff.value} value={diff.value} className="text-gray-100 focus:bg-gray-700">
                        {diff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Category</label>
                <Select value={gameSettings.category} onValueChange={(value) => setGameSettings(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="w-full bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 max-h-60">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-gray-100 focus:bg-gray-700">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Questions (Multiplayer only)</label>
                <Select value={gameSettings.amount.toString()} onValueChange={(value) => setGameSettings(prev => ({ ...prev, amount: parseInt(value) }))}>
                  <SelectTrigger className="w-full bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select amount" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {QUESTION_AMOUNTS.map(amount => (
                      <SelectItem key={amount.value} value={amount.value.toString()} className="text-gray-100 focus:bg-gray-700">
                        {amount.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setGameMode('menu')}
                variant="outline"
                className="flex-1 bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70"
              >
                Back
              </Button>
              <Button 
                onClick={() => setGameMode('menu')}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de menú principal
  if (gameMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-black"></div>
        <Card className="w-full max-w-md relative z-10 bg-gray-900/80 backdrop-blur-xl border-gray-700 shadow-2xl shadow-purple-500/10">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-400 mr-2" />
              <div className="text-center">
                <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Trivia Questions
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">
                  made by Alf
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-lg">Choose your game mode</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={() => setGameMode('settings')}
              variant="outline"
              className="w-full bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70 py-3 text-lg font-semibold transition-all duration-300"
            >
              <Settings className="w-5 h-5 mr-2" />
              Game Settings
            </Button>
            
            <Button 
              onClick={() => setGameMode('single')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 text-lg font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Single Player
            </Button>
            
            <div className="space-y-4">
              <Input
                placeholder="Enter your name (optional)"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-gray-800/50 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20 py-3 text-lg"
              />
              
              <Button 
                onClick={createRoom}
                disabled={cargando}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-4 text-lg font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {cargando ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Users className="w-5 h-5 mr-2" />}
                Create Room
              </Button>
              
              <div className="flex gap-3">
                <Input
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-gray-800/50 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20 py-3 text-lg"
                />
                <Button 
                  onClick={joinRoom}
                  disabled={!roomCode.trim() || cargando}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de carga o sala de espera multijugador
  if (cargando || (gameMode === 'single' && !preguntaActual) || (gameMode === 'multiplayer' && !gameState.currentQuestion)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-black"></div>
        <Card className="w-full max-w-2xl relative z-10 bg-gray-900/80 backdrop-blur-xl border-gray-700 shadow-2xl shadow-purple-500/10">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="text-center space-y-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin mx-auto text-purple-400" />
                <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 animate-pulse"></div>
              </div>
              <p className="text-xl text-gray-300 font-medium">
                {gameMode === 'multiplayer' && gameState.questionNumber === 0 
                  ? (gameState.isHost ? 'You are the host! Click "Start Game" to begin.' : 'Waiting for host to start the game...') 
                  : gameMode === 'multiplayer' 
                    ? 'Waiting for game to start...' 
                    : 'Loading new question...'}
              </p>
              
              {/* Mostrar información de la sala si está en modo multijugador */}
              {gameMode === 'multiplayer' && (
                <div className="space-y-4">
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button onClick={copyRoomCode} variant="outline" size="sm" className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70">
                      <Copy className="w-4 h-4 mr-1" />
                      Copy: {roomCode}
                    </Button>
                    <Button onClick={shareRoom} variant="outline" size="sm" className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70">
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                  
                  {gameState.players.length > 0 && (
                    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                      <p className="text-sm font-medium text-gray-300 mb-3">Players in room:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {gameState.players.map(player => (
                          <Badge 
                            key={player.id} 
                            className="bg-purple-900/50 text-purple-300 border-purple-600"
                          >
                            {player.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-center">
                    {gameState.isHost && gameState.questionNumber === 0 && (
                      <Button 
                        onClick={startNextQuestion}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-4 text-lg font-bold shadow-lg shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 animate-pulse"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Start Game
                      </Button>
                    )}
                    
                    <Button 
                      onClick={backToMenu}
                      variant="outline"
                      className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70 px-6 py-2 transition-all duration-300"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Back to Menu
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = gameMode === 'multiplayer' ? gameState.currentQuestion : preguntaActual;
  const currentQuestionNumber = gameMode === 'multiplayer' ? gameState.questionNumber : totalPreguntas + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-black"></div>
      <Card className="w-full max-w-4xl relative z-10 bg-gray-900/80 backdrop-blur-xl border-gray-700 shadow-2xl shadow-purple-500/10">
        <CardHeader className="pb-4">
          {/* Header compacto para móviles */}
          <div className="flex flex-col space-y-3">
            {/* Primera fila: Question number y Back button */}
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="text-sm bg-purple-900/50 text-purple-300 border-purple-600 px-3 py-1">
                Question #{currentQuestionNumber}
              </Badge>
              <Button 
                onClick={backToMenu}
                variant="outline"
                size="sm"
                className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70"
              >
                <Home className="w-4 h-4 mr-1" />
                Menu
              </Button>
            </div>
            
            {/* Segunda fila: Score/Room info */}
            <div className="flex justify-center">
              {gameMode === 'single' ? (
                <div className="flex gap-3">
                  <Badge variant="secondary" className="text-sm bg-blue-900/50 text-blue-300 border-blue-600 px-3 py-1">
                    Score: {puntuacion}/{totalPreguntas}
                  </Badge>
                  {totalPreguntas > 0 && (
                    <Badge variant="outline" className="text-sm bg-emerald-900/50 text-emerald-300 border-emerald-600 px-3 py-1">
                      {Math.round((puntuacion / totalPreguntas) * 100)}%
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap justify-center">
                  <Badge variant="secondary" className="text-sm bg-purple-900/50 text-purple-300 border-purple-600 px-3 py-1">
                    Room: {roomCode}
                  </Badge>
                  <Button onClick={copyRoomCode} variant="outline" size="sm" className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70 h-6 px-2 text-xs">
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Información de la pregunta */}
          <div className="space-y-3 mt-4">
            <div className="flex gap-2 text-sm justify-center flex-wrap">
              <Badge variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-600 text-xs">{currentQuestion.category}</Badge>
              <Badge variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-600 capitalize text-xs">{currentQuestion.difficulty}</Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-100 leading-relaxed text-center">
              {currentQuestion.question}
            </CardTitle>
          </div>
          
          {/* Información de jugadores en modo multijugador */}
          {gameMode === 'multiplayer' && gameState.players.length > 0 && (
            <div className="mt-4 p-3 bg-gray-800/30 rounded-xl border border-gray-700">
              <p className="text-xs font-medium text-gray-300 mb-2 text-center">Players:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {gameState.players.map(player => (
                  <Badge 
                    key={player.id} 
                    variant={player.has_answered ? "default" : "outline"}
                    className={`text-xs ${player.has_answered 
                      ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600' 
                      : 'bg-gray-800/50 text-gray-400 border-gray-600'
                    }`}
                  >
                    {player.name} ({player.score})
                    {player.has_answered && " ✓"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {currentQuestion.options.map((opcion, indice) => (
              <Button
                key={indice}
                onClick={() => manejarSeleccionRespuesta(indice)}
                className={`${obtenerColorBoton(indice)} border-2 text-left justify-start p-4 h-auto text-wrap transition-all duration-300 transform hover:scale-[1.02]`}
                disabled={mostrarResultado}
              >
                <span className="flex items-center justify-between w-full">
                  <span className="text-sm md:text-base font-medium">{opcion}</span>
                  {obtenerIcono(indice)}
                </span>
              </Button>
            ))}
          </div>
          
          {mostrarResultado && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-center space-y-4">
                <p className="text-lg md:text-xl">
                  {respuestaSeleccionada === currentQuestion.correct_answer ? (
                    <span className="text-emerald-400 font-bold">Correct! 🎉</span>
                  ) : (
                    <span className="text-red-400 font-bold">
                      Incorrect. Correct: <span className="text-emerald-400">{currentQuestion.options[currentQuestion.correct_answer]}</span>
                    </span>
                  )}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {gameMode === 'single' || gameState.isHost ? (
                    <Button 
                      onClick={siguientePregunta}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
                    >
                      Next Question
                    </Button>
                  ) : (
                    <p className="text-gray-400">Waiting for host...</p>
                  )}
                  
                  <Button 
                    onClick={reiniciarJuego}
                    variant="outline"
                    className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/70 px-6 py-2 font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {gameMode === 'multiplayer' ? 'Leave' : 'Restart'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;

