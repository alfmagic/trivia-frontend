import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCog, faPlay, faUsers, faShareAlt, faCopy, faCheck, faTimes, faSpinner, faArrowLeft, faRedo } from '@fortawesome/free-solid-svg-icons';

// Define the base URL for your backend API
// IMPORTANT: Replace this with the URL of your deployed backend once you have it!
// For local development, it might be 'http://localhost:5000'
// For Render, it will be something like 'https://your-app-name.onrender.com'
const API_BASE_URL = 'https://trivia-backend-odlc.onrender.com'; // Apunta a mi backend de prueba

function App( ) {
  const [gameState, setGameState] = useState('menu'); // menu, singlePlayer, multiplayer, gameSettings, roomLobby
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', null
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomLinkCopied, setRoomLinkCopied] = useState(false);
  const [showPlayerNameInput, setShowPlayerNameInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [multiplayerQuestionIndex, setMultiplayerQuestionIndex] = useState(0);
  const [multiplayerTotalQuestions, setMultiplayerTotalQuestions] = useState(0);
  const [playerScores, setPlayerScores] = useState({});
  const [playerAnswered, setPlayerAnswered] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState('any');
  const [category, setCategory] = useState('any');
  const [numQuestions, setNumQuestions] = useState(10); // For multiplayer
  const [copiedText, setCopiedText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, connected, disconnected

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const animalNames = [
    "Brave Lion", "Clever Fox", "Swift Eagle", "Mighty Bear", "Wise Owl",
    "Graceful Deer", "Noble Wolf", "Playful Dolphin", "Silent Panther", "Curious Monkey",
    "Loyal Dog", "Gentle Giant", "Sharp Hawk", "Quick Cheetah", "Patient Turtle",
    "Proud Peacock", "Sly Serpent", "Strong Gorilla", "Vigilant Falcon", "Agile Leopard",
    "Fierce Tiger", "Calm Panda", "Majestic Elephant", "Shrewd Badger", "Nimble Squirrel",
    "Bold Rhino", "Keen Vulture", "Daring Wolverine", "Stealthy Lynx", "Resilient Boar"
  ];

  const categories = [
    { id: 'any', name: 'Any Category' },
    { id: 9, name: 'General Knowledge' },
    { id: 10, name: 'Entertainment: Books' },
    { id: 11, name: 'Entertainment: Film' },
    { id: 12, name: 'Entertainment: Music' },
    { id: 13, name: 'Entertainment: Musicals & Theatres' },
    { id: 14, name: 'Entertainment: Television' },
    { id: 15, name: 'Entertainment: Video Games' },
    { id: 16, name: 'Entertainment: Board Games' },
    { id: 17, name: 'Science & Nature' },
    { id: 18, name: 'Science: Computers' },
    { id: 19, name: 'Science: Mathematics' },
    { id: 20, name: 'Mythology' },
    { id: 21, name: 'Sports' },
    { id: 22, name: 'Geography' },
    { id: 23, name: 'History' },
    { id: 24, name: 'Politics' },
    { id: 25, name: 'Art' },
    { id: 26, name: 'Celebrities' },
    { id: 27, name: 'Animals' },
    { id: 28, name: 'Vehicles' },
    { id: 29, name: 'Entertainment: Comics' },
    { id: 30, name: 'Science: Gadgets' },
    { id: 31, name: 'Entertainment: Japanese Anime & Manga' },
    { id: 32, name: 'Entertainment: Cartoon & Animations' }
  ];

  const checkBackendConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
        setError('Backend is unreachable. Please check your internet connection or try again later.');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      if (err.name === 'TimeoutError') {
        setError('Connection timed out. Please check your internet connection or try again later.');
      } else {
        setError('Network error. Please check your internet connection.');
      }
    }
  }, []);

  useEffect(() => {
    checkBackendConnection();

    // Logic for roomParam from URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setRoomCodeInput(roomParam);
      setShowPlayerNameInput(true);
    }
  }, [checkBackendConnection]);

  const generateRandomAnimalName = () => {
    const randomIndex = Math.floor(Math.random() * animalNames.length);
    return animalNames[randomIndex];
  };

  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  const handleRoomCodeChange = (e) => {
    setRoomCodeInput(e.target.value.toUpperCase());
  };

  const handleCreateRoom = async () => {
    if (connectionStatus !== 'connected') {
      setError('Cannot create room: Backend is not connected.');
      return;
    }
    setLoading(true);
    setError(null);
    const name = playerName.trim() === '' ? generateRandomAnimalName() : playerName.trim();
    setPlayerName(name);

    try {
      const response = await fetch(`${API_BASE_URL}/create_room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name, difficulty, category, num_questions: numQuestions }),
        signal: AbortSignal.timeout(20000) // 20 seconds timeout
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }
      const data = await response.json();
      setRoomId(data.room_id);
      setPlayers(data.players);
      setIsHost(true);
      setGameState('roomLobby');
      setGameStarted(false);
      setMultiplayerQuestionIndex(0);
      setMultiplayerTotalQuestions(numQuestions);
      setPlayerScores({});
      setPlayerAnswered({});
      startPollingRoomState(data.room_id, name);
    } catch (err) {
      setError(`Error creating room: ${err.message}`);
      console.error('Error creating room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (connectionStatus !== 'connected') {
      setError('Cannot join room: Backend is not connected.');
      return;
    }
    if (!roomCodeInput) {
      setError('Please enter a room code.');
      return;
    }
    setLoading(true);
    setError(null);
    const name = playerName.trim() === '' ? generateRandomAnimalName() : playerName.trim();
    setPlayerName(name);

    try {
      const response = await fetch(`${API_BASE_URL}/join_room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomCodeInput, player_name: name }),
        signal: AbortSignal.timeout(20000) // 20 seconds timeout
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join room');
      }
      const data = await response.json();
      setRoomId(data.room_id);
      setPlayers(data.players);
      setIsHost(false);
      setGameState('roomLobby');
      setGameStarted(data.game_started);
      setMultiplayerQuestionIndex(data.current_question_index || 0);
      setMultiplayerTotalQuestions(data.total_questions || numQuestions);
      setPlayerScores(data.player_scores || {});
      setPlayerAnswered(data.player_answered || {});
      startPollingRoomState(data.room_id, name);
    } catch (err) {
      setError(`Error joining room: ${err.message}`);
      console.error('Error joining room:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPollingRoomState = useCallback((currentRoomId, currentPlayerName) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/room_state/${currentRoomId}?player_name=${encodeURIComponent(currentPlayerName)}`, {
          signal: AbortSignal.timeout(10000) // 10 seconds timeout for polling
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Room not found or expired. Returning to menu.');
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch room state');
        }
        const data = await response.json();

        setPlayers(data.players);
        setGameStarted(data.game_started);
        setQuestion(data.current_question);
        setMultiplayerQuestionIndex(data.current_question_index);
        setMultiplayerTotalQuestions(data.total_questions);
        setPlayerScores(data.player_scores || {});
        setPlayerAnswered(data.player_answered || {});
        setGameEnded(data.game_ended);

        if (data.game_ended) {
          clearInterval(intervalRef.current);
          setGameState('multiplayerResults');
        }

      } catch (err) {
        console.error('Polling error:', err);
        setError(`Polling error: ${err.message}`);
        clearInterval(intervalRef.current);
        setGameState('menu'); // Go back to menu on critical polling error
        setRoomId('');
        setIsHost(false);
        setGameStarted(false);
      }
    }, 2000); // Poll every 2 seconds
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleStartGame = async () => {
    if (connectionStatus !== 'connected') {
      setError('Cannot start game: Backend is not connected.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/start_game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId }),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game');
      }
      const data = await response.json();
      setGameStarted(true);
      setQuestion(data.question);
      setMultiplayerQuestionIndex(1);
      setMultiplayerTotalQuestions(data.total_questions);
      setPlayerScores(data.player_scores || {});
      setPlayerAnswered(data.player_answered || {});
      setGameState('multiplayer');
    } catch (err) {
      setError(`Error starting game: ${err.message}`);
      console.error('Error starting game:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestion = useCallback(async () => {
    if (connectionStatus !== 'connected') {
      setError('Cannot fetch question: Backend is not connected.');
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setFeedback(null);
    try {
      const params = new URLSearchParams();
      if (difficulty !== 'any') params.append('difficulty', difficulty);
      if (category !== 'any') params.append('category', category);

      const response = await fetch(`${API_BASE_URL}/question?${params.toString()}`, {
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch question');
      }
      const data = await response.json();
      setQuestion(data);
      setLoading(false);
    } catch (err) {
      setError(`Error fetching question: ${err.message}`);
      console.error('Error fetching question:', err);
      setLoading(false);
    }
  }, [difficulty, category, connectionStatus]);

  useEffect(() => {
    if (gameState === 'singlePlayer' && !question) {
      fetchQuestion();
    }
  }, [gameState, question, fetchQuestion]);

  const handleAnswer = async (answer) => {
    if (selectedAnswer) return; // Prevent multiple answers
    setSelectedAnswer(answer);

    if (gameState === 'singlePlayer') {
      const isCorrect = answer === question.correct_answer;
      setFeedback(isCorrect ? 'correct' : 'incorrect');
      if (isCorrect) {
        setScore(score + 1);
        setCorrectAnswers(correctAnswers + 1);
      }
      setQuestionCount(questionCount + 1);

      timeoutRef.current = setTimeout(() => {
        setQuestion(null); // Clear question to trigger fetch for next one
        setSelectedAnswer(null);
        setFeedback(null);
      }, 1500); // Show feedback for 1.5 seconds
    } else if (gameState === 'multiplayer') {
      if (connectionStatus !== 'connected') {
        setError('Cannot submit answer: Backend is not connected.');
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/submit_answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: roomId,
            player_name: playerName,
            question_id: question.id,
            answer: answer
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit answer');
        }
        // No need to update state here, polling will handle it
      } catch (err) {
        setError(`Error submitting answer: ${err.message}`);
        console.error('Error submitting answer:', err);
      }
    }
  };

  const resetGame = () => {
    setScore(0);
    setQuestionCount(0);
    setCorrectAnswers(0);
    setQuestion(null);
    setSelectedAnswer(null);
    setFeedback(null);
    setGameState('menu');
    setPlayerName('');
    setRoomId('');
    setPlayers([]);
    setIsHost(false);
    setRoomCodeInput('');
    setRoomLinkCopied(false);
    setShowPlayerNameInput(false);
    setLoading(false);
    setError(null);
    setGameStarted(false);
    setGameEnded(false);
    setMultiplayerQuestionIndex(0);
    setMultiplayerTotalQuestions(0);
    setPlayerScores({});
    setPlayerAnswered({});
    setShowSettings(false);
    setDifficulty('any');
    setCategory('any');
    setNumQuestions(10);
    setCopiedText('');
    setCopySuccess(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleBackToMenu = () => {
    if (window.confirm('Are you sure you want to go back to the main menu? Your current game progress will be lost.')) {
      resetGame();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setCopySuccess(false);
    });
  };

  const getAnswerClass = (answer) => {
    if (selectedAnswer === answer) {
      if (feedback === 'correct') return 'correct';
      if (feedback === 'incorrect') return 'incorrect';
    }
    if (feedback && answer === question.correct_answer) return 'correct-answer';
    return '';
  };

  const renderQuestion = () => {
    if (loading) return <div className="loading-spinner"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!question) return <div className="loading-spinner"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>;

    const allAnswers = [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5);

    return (
      <div className="question-container">
        <div className="question-header">
          {gameState === 'singlePlayer' && (
            <div className="question-counter">Question #{questionCount + 1}</div>
          )}
          {gameState === 'multiplayer' && (
            <div className="question-counter">Question {multiplayerQuestionIndex} / {multiplayerTotalQuestions}</div>
          )}
          <div className="score-display">Score: {score}</div>
        </div>
        <h2 className="question-text" dangerouslySetInnerHTML={{ __html: question.question }}></h2>
        <div className="answers-grid">
          {allAnswers.map((answer, index) => (
            <button
              key={index}
              className={`answer-button ${getAnswerClass(answer)} ${selectedAnswer ? 'answered' : ''}`}
              onClick={() => handleAnswer(answer)}
              disabled={selectedAnswer !== null}
              dangerouslySetInnerHTML={{ __html: answer }}
            ></button>
          ))}
        </div>
      </div>
    );
  };

  const renderMultiplayerLobby = () => {
    const roomLink = `${window.location.origin}?room=${roomId}`;
    return (
      <div className="lobby-container">
        <h2 className="lobby-title">Room: {roomId}</h2>
        <p className="lobby-subtitle">Share this code or link with your friends!</p>
        <div className="share-options">
          <div className="share-item">
            <span className="share-text">{roomId}</span>
            <button className="copy-button" onClick={() => copyToClipboard(roomId)}>
              <FontAwesomeIcon icon={faCopy} /> {copiedText === roomId && copySuccess ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="share-item">
            <span className="share-text">{roomLink}</span>
            <button className="copy-button" onClick={() => copyToClipboard(roomLink)}>
              <FontAwesomeIcon icon={faCopy} /> {copiedText === roomLink && copySuccess ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <h3 className="players-title">Players in Room ({players.length}):</h3>
        <ul className="player-list">
          {players.map((player, index) => (
            <li key={index} className="player-item">
              {player.name} {player.id === playerName ? '(You)' : ''} {player.is_host ? '(Host)' : ''}
            </li>
          ))}
        </ul>

        {isHost && !gameStarted && (
          <div className="host-actions">
            <p className="host-message">You are the host! Click 'Start Game' to begin.</p>
            <button className="start-game-button" onClick={handleStartGame} disabled={loading}>
              {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faPlay} /> Start Game</>}
            </button>
          </div>
        )}

        {!isHost && !gameStarted && (
          <p className="waiting-message">Waiting for host to start the game...</p>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  };

  const renderMultiplayerResults = () => {
    const sortedScores = Object.entries(playerScores).sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
    return (
      <div className="results-container">
        <h2 className="results-title">Game Over!</h2>
        <h3 className="results-subtitle">Final Scores:</h3>
        <ul className="score-list">
          {sortedScores.map(([player, score]) => (
            <li key={player} className="score-item">
              {player}: {score} points
            </li>
          ))}
        </ul>
        <button className="main-menu-button" onClick={resetGame}>
          <FontAwesomeIcon icon={faRedo} /> Play Again / Main Menu
        </button>
      </div>
    );
  };

  const renderGameSettings = () => {
    return (
      <div className="settings-container">
        <h2 className="settings-title">Game Settings</h2>

        <div className="setting-group">
          <label htmlFor="difficulty-select" className="setting-label">Difficulty:</label>
          <select
            id="difficulty-select"
            className="setting-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="any">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="category-select" className="setting-label">Category:</label>
          <select
            id="category-select"
            className="setting-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="num-questions-select" className="setting-label">Multiplayer Questions:</label>
          <select
            id="num-questions-select"
            className="setting-select"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
          >
            {[5, 10, 15, 20, 25].map(num => (
              <option key={num} value={num}>{num} Questions</option>
            ))}
          </select>
        </div>

        <button className="back-button" onClick={() => setShowSettings(false)}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Menu
        </button>
      </div>
    );
  };

  const renderMainMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    // Note: The useEffect for roomParam is now in the main App component's useEffect.
    // This function only renders the UI based on state.

    return (
      <div className="main-menu">
        <h1 className="game-title">Trivia Questions</h1>
        <p className="game-subtitle">made by Alf</p>

        {connectionStatus === 'checking' && (
          <div className="connection-status checking">
            <FontAwesomeIcon icon={faSpinner} spin /> Checking backend connection...
          </div>
        )}
        {connectionStatus === 'disconnected' && (
          <div className="connection-status disconnected">
            <FontAwesomeIcon icon={faTimes} /> Backend disconnected. {error}
          </div>
        )}
        {connectionStatus === 'connected' && (
          <div className="connection-status connected">
            <FontAwesomeIcon icon={faCheck} /> Backend connected!
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {!showPlayerNameInput && (
          <div className="menu-options">
            <button className="menu-button single-player-button" onClick={() => { setGameState('singlePlayer'); setQuestionCount(0); setScore(0); setCorrectAnswers(0); fetchQuestion(); }}>
              <FontAwesomeIcon icon={faPlay} /> Single Player
            </button>
            <button className="menu-button" onClick={() => setShowPlayerNameInput(true)}>
              <FontAwesomeIcon icon={faUsers} /> Multiplayer
            </button>
            <button className="menu-button" onClick={() => setShowSettings(true)}>
              <FontAwesomeIcon icon={faCog} /> Game Settings
            </button>
          </div>
        )}

        {showPlayerNameInput && !showSettings && (
          <div className="player-name-input-section">
            <input
              type="text"
              placeholder="Enter your name (optional)"
              value={playerName}
              onChange={handleNameChange}
              className="name-input"
              disabled={loading}
            />
            <button className="menu-button create-room-button" onClick={handleCreateRoom} disabled={loading || connectionStatus !== 'connected'}>
              {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faUsers} /> Create Room</>}
            </button>
            <div className="join-room-section">
              <input
                type="text"
                placeholder="Enter Room Code"
                value={roomCodeInput}
                onChange={handleRoomCodeChange}
                className="room-code-input"
                maxLength="6"
                disabled={loading}
              />
              <button className="menu-button join-room-button" onClick={handleJoinRoom} disabled={loading || !roomCodeInput || connectionStatus !== 'connected'}>
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faUsers} /> Join Room</>}
              </button>
            </div>
            <button className="back-button" onClick={() => setShowPlayerNameInput(false)}>
              <FontAwesomeIcon icon={faArrowLeft} /> Back
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      {(gameState === 'singlePlayer' || gameState === 'multiplayer' || gameState === 'multiplayerResults') && (
        <button className="back-to-menu-button" onClick={handleBackToMenu}>
          <FontAwesomeIcon icon={faHome} /> Back to Menu
        </button>
      )}

      {showSettings ? renderGameSettings() : (
        gameState === 'menu' ? renderMainMenu() :
        gameState === 'singlePlayer' ? renderQuestion() :
        gameState === 'roomLobby' ? renderMultiplayerLobby() :
        gameState === 'multiplayer' ? renderQuestion() :
        gameState === 'multiplayerResults' ? renderMultiplayerResults() : null
      )}
    </div>
  );
}

export default App;
