import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Type, Calculator, Square, Download, Trash2, RefreshCw, Pen, Highlighter, Eraser, Undo2, Redo2, ZoomIn, ZoomOut, ChevronLeft, Plus } from 'lucide-react';
import './App.css';

const MYSCRIPT_APP_KEY = process.env.REACT_APP_MYSCRIPT_KEY;
const MYSCRIPT_HMAC_KEY = process.env.REACT_APP_MYSCRIPT_HMAC;

type RecogMode = 'TEXT' | 'MATH' | 'DIAGRAM';
type PenTool = 'pen' | 'highlighter' | 'eraser';
interface Page { id: number; label: string; }
interface StrokePoint { x: number; y: number; }
interface Stroke { points: StrokePoint[]; }

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeMode, setActiveMode] = useState<RecogMode>('TEXT');
  const [activeTool, setActiveTool] = useState<PenTool>('pen');
  const [status, setStatus] = useState('Ready to draw');
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pages, setPages] = useState<Page[]>([{ id: 1, label: 'Page 1' }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      setCtx(context);
      
      // Set canvas size
      const resizeCanvas = () => {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
          redrawStrokes();
        }
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  // Redraw all strokes when needed
  const redrawStrokes = useCallback(() => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Set drawing styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw all completed strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    
    // Draw current stroke
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : '#000000';
      ctx.lineWidth = activeTool === 'eraser' ? 20 : 2;
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  }, [ctx, strokes, currentStroke, activeTool]);

  useEffect(() => {
    redrawStrokes();
  }, [redrawStrokes]);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCoordinates(e);
    if (!point) return;
    
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const point = getCoordinates(e);
    if (!point) return;
    
    setCurrentStroke(prev => [...prev, point]);
  };

  const stopDrawing = () => {
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke }]);
    }
    setCurrentStroke([]);
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): StrokePoint | null => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    
    return { x, y };
  };

  // Clear canvas
  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setStatus('Cleared');
  };

  // Recognize handwriting using MyScript REST API
  const handleRecognize = async () => {
    if (strokes.length === 0) {
      setStatus('No strokes to recognize');
      return;
    }

    setStatus('Recognizing...');
    
    try {
      // Convert strokes to MyScript format
      const myScriptStrokes = strokes.map(stroke => ({
        x: stroke.points.map(p => [p.x]),
        y: stroke.points.map(p => [p.y])
      }));

      const payload: any = {
        configuration: {
          "text": {
            "mimeTypes": ["text/plain", "application/vnd.myscript.jiix"],
            "textMargin": 0.1
          },
          "math": {
            "mimeTypes": ["application/vnd.myscript.jiix", "application/x-latex"],
            "margin": 0.1
          },
          "diagram": {
            "mimeTypes": ["application/vnd.myscript.jiix"],
            "margin": 0.1
          }
        },
        strokeGroups: [{
          strokes: myScriptStrokes
        }]
      };

      // Add type-specific configuration
      if (activeMode === 'MATH') {
        payload.configuration.math = {
          mimeTypes: ["application/vnd.myscript.jiix", "application/x-latex"],
          margin: 0.1
        };
        payload.configuration.text = undefined;
        payload.configuration.diagram = undefined;
      } else if (activeMode === 'DIAGRAM') {
        payload.configuration.diagram = {
          mimeTypes: ["application/vnd.myscript.jiix"],
          margin: 0.1
        };
        payload.configuration.text = undefined;
        payload.configuration.math = undefined;
      } else {
        payload.configuration.text = {
          mimeTypes: ["text/plain", "application/vnd.myscript.jiix"],
          textMargin: 0.1
        };
        payload.configuration.math = undefined;
        payload.configuration.diagram = undefined;
      }

      console.log('Sending payload:', payload);

      // Call MyScript REST API
      const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'applicationKey': MYSCRIPT_APP_KEY || '',
          'hmac': MYSCRIPT_HMAC_KEY || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Recognition failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Recognition result:', result);

      // Parse result based on mode
      let recognizedText = '';
      
      if (activeMode === 'MATH' && result.math) {
        recognizedText = result.math[0]?.label || 'Math expression detected';
      } else if (activeMode === 'DIAGRAM' && result.diagram) {
        recognizedText = JSON.stringify(result.diagram[0] || 'Diagram detected');
      } else if (result.text) {
        recognizedText = result.text[0]?.label || 'Text detected';
      } else {
        recognizedText = JSON.stringify(result, null, 2);
      }

      setRecognitionResult(recognizedText);
      setShowResult(true);
      setStatus('Recognition complete');

    } catch (error) {
      console.error('Recognition error:', error);
      setStatus(`Recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to demo mode
      handleDemoMode();
    }
  };

  // Demo mode for testing without API
  const handleDemoMode = () => {
    const demos = {
      TEXT: "The quick brown fox jumps over the lazy dog",
      MATH: "f(x) = x² + 2x + 1",
      DIAGRAM: "Circle detected at center (150, 150) with radius 50"
    };
    
    setRecognitionResult(demos[activeMode]);
    setShowResult(true);
    setStatus('Demo mode - no API connection');
  };

  // Export canvas as PNG
  const handleExport = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `page-${currentPage}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setStatus('Exported PNG');
  };

  // Page management
  const addPage = () => {
    const newId = pages.length + 1;
    setPages(prev => [...prev, { id: newId, label: `Page ${newId}` }]);
    setCurrentPage(newId);
    handleClear();
    setStatus(`Page ${newId}`);
  };

  const switchPage = (pageId: number) => {
    setCurrentPage(pageId);
    handleClear();
    setStatus(`Page ${pageId}`);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    const z = Math.min(zoom + 25, 200);
    setZoom(z);
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${z / 100})`;
      canvasRef.current.style.transformOrigin = 'top left';
    }
  };

  const handleZoomOut = () => {
    const z = Math.max(zoom - 25, 50);
    setZoom(z);
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${z / 100})`;
      canvasRef.current.style.transformOrigin = 'top left';
    }
  };

  return (
    <div className="app-container">
      {/* TOP TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar-section">
          <button className="btn btn-icon" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
            <ChevronLeft size={16} style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.2s' }} />
          </button>
          <div className="toolbar-divider" />
          <button onClick={() => setActiveMode('TEXT')} className={`btn ${activeMode === 'TEXT' ? 'active-text' : ''}`}>
            <Type size={15} /><span>Text</span>
          </button>
          <button onClick={() => setActiveMode('MATH')} className={`btn ${activeMode === 'MATH' ? 'active-math' : ''}`}>
            <Calculator size={15} /><span>Math</span>
          </button>
          <button onClick={() => setActiveMode('DIAGRAM')} className={`btn ${activeMode === 'DIAGRAM' ? 'active-diagram' : ''}`}>
            <Square size={15} /><span>Diagram</span>
          </button>
        </div>

        <div className="toolbar-section">
          <div className="toolbar-divider" />
          <button onClick={() => setActiveTool('pen')} className={`btn btn-icon ${activeTool === 'pen' ? 'active-tool' : ''}`} title="Pen">
            <Pen size={15} />
          </button>
          <button onClick={() => setActiveTool('highlighter')} className={`btn btn-icon ${activeTool === 'highlighter' ? 'active-tool' : ''}`} title="Highlighter">
            <Highlighter size={15} />
          </button>
          <button onClick={() => setActiveTool('eraser')} className={`btn btn-icon ${activeTool === 'eraser' ? 'active-tool' : ''}`} title="Eraser">
            <Eraser size={15} />
          </button>
        </div>

        <div className="toolbar-section">
          <div className="toolbar-divider" />
          <span className="status-text">{status}</span>
          <div className="toolbar-divider" />
          <button onClick={handleRecognize} className="btn"><RefreshCw size={15} /><span>Recognize</span></button>
          <button onClick={handleExport} className="btn"><Download size={15} /><span>Export</span></button>
          <button onClick={handleClear} className="btn btn-clear btn-icon" title="Clear"><Trash2 size={15} /></button>
        </div>
      </div>

      {/* BODY */}
      <div className="app-body">
        {/* SIDEBAR */}
        <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-title">Notebook</div>
          {pages.map(page => (
            <div key={page.id} className={`page-item ${currentPage === page.id ? 'active' : ''}`} onClick={() => switchPage(page.id)}>
              <span className="page-item-icon">📄</span>
              <span className="page-item-label">{page.label}</span>
            </div>
          ))}
          <button className="add-page-btn" onClick={addPage}>
            <Plus size={14} /> Add Page
          </button>
        </div>

        {/* CANVAS */}
        <div className="editor-wrapper">
          <div className="editor-container">
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
            />
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomIn}><ZoomIn size={16} /></button>
              <div className="zoom-label">{zoom}%</div>
              <button className="zoom-btn" onClick={handleZoomOut}><ZoomOut size={16} /></button>
            </div>
          </div>
          <div className="page-indicator">Page {currentPage} of {pages.length}</div>
        </div>

        {/* RECOGNITION RESULT PANEL */}
        {showResult && (
          <div className="result-panel">
            <div className="result-header">
              <h3>Recognition Result</h3>
              <button onClick={() => setShowResult(false)}>✕</button>
            </div>
            <div className="result-content">
              <pre>{recognitionResult}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;