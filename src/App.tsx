import React, { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore
import * as iink from 'iink-js';
import { Type, Calculator, Square, Download, Trash2, RefreshCw, Pen, Highlighter, Eraser, Undo2, Redo2, ZoomIn, ZoomOut, ChevronLeft, Plus } from 'lucide-react';
import './App.css';

const MYSCRIPT_APP_KEY = '625e304c-1a74-427d-be4e-465763e7e0af';
const MYSCRIPT_HMAC_KEY = '3e0d9a2c-8c4c-4706-ac0c-fb6b9c66bd8d';

type RecogMode = 'TEXT' | 'MATH' | 'DIAGRAM';
type PenTool = 'pen' | 'highlighter' | 'eraser';
interface Page { id: number; label: string; }

const App: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);
  const [activeMode, setActiveMode] = useState<RecogMode>('TEXT');
  const [activeTool, setActiveTool] = useState<PenTool>('pen');
  const [status, setStatus] = useState('Initializing...');
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pages, setPages] = useState<Page[]>([{ id: 1, label: 'Page 1' }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const initEditor = useCallback(() => {
    if (!editorRef.current) return;
    if (editorRef.current.clientHeight < 10) { setTimeout(initEditor, 100); return; }
    if (editorInstance.current) {
      try { editorInstance.current.close(); } catch (_) {}
      editorInstance.current = null;
    }
    try {
      editorInstance.current = iink.register(editorRef.current, {
        recognitionParams: {
          type: activeMode,
          protocol: 'WEBSOCKET',
          server: { applicationKey: MYSCRIPT_APP_KEY, hmacKey: MYSCRIPT_HMAC_KEY },
          iink: { export: { jiix: { strokes: true } } }
        }
      });
      setStatus('Ready — write something!');
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatus('Error loading editor.');
      setLoading(false);
    }
  }, [activeMode]);

  useEffect(() => {
    const handleResize = () => editorInstance.current?.resize();
    const timer = setTimeout(initEditor, 200);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (editorInstance.current) {
        try { editorInstance.current.close(); } catch (_) {}
        editorInstance.current = null;
      }
    };
  }, [initEditor]);

  useEffect(() => {
    if (editorInstance.current?.configuration) {
      const newConfig = { ...editorInstance.current.configuration };
      newConfig.recognitionParams.type = activeMode;
      editorInstance.current.configuration = newConfig;
      setStatus(`Mode: ${activeMode}`);
    }
  }, [activeMode]);

  useEffect(() => {
    if (!editorInstance.current) return;
    try { editorInstance.current.tool = activeTool; } catch (_) {}
  }, [activeTool]);

  const handleZoomIn = () => {
    const z = Math.min(zoom + 25, 200);
    setZoom(z);
    if (editorRef.current) {
      editorRef.current.style.transform = `scale(${z / 100})`;
      editorRef.current.style.transformOrigin = 'top left';
    }
  };

  const handleZoomOut = () => {
    const z = Math.max(zoom - 25, 50);
    setZoom(z);
    if (editorRef.current) {
      editorRef.current.style.transform = `scale(${z / 100})`;
      editorRef.current.style.transformOrigin = 'top left';
    }
  };

  const addPage = () => {
    const newId = pages.length + 1;
    setPages(prev => [...prev, { id: newId, label: `Page ${newId}` }]);
    setCurrentPage(newId);
    setTimeout(() => { editorInstance.current?.clear(); setStatus(`Page ${newId}`); }, 100);
  };

  const switchPage = (pageId: number) => {
    setCurrentPage(pageId);
    editorInstance.current?.clear();
    setStatus(`Page ${pageId}`);
  };

  const handleUndo = () => editorInstance.current?.undo();
  const handleRedo = () => editorInstance.current?.redo();
  const handleClear = () => { editorInstance.current?.clear(); setStatus('Cleared'); };
  const handleConvert = () => { editorInstance.current?.convert(); setStatus('Converting...'); };

  const handleExport = async () => {
    if (!editorInstance.current) return;
    try {
      const canvas = editorRef.current?.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.download = `page-${currentPage}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setStatus('Exported PNG!');
        return;
      }
      const result = await editorInstance.current.export_(['application/vnd.myscript.jiix']);
      console.log(result);
      setStatus('Exported JSON');
    } catch (e) { console.error(e); setStatus('Export failed'); }
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
          <div className="toolbar-divider" />
          <button onClick={handleUndo} className="btn btn-icon" title="Undo"><Undo2 size={15} /></button>
          <button onClick={handleRedo} className="btn btn-icon" title="Redo"><Redo2 size={15} /></button>
        </div>

        <div className="toolbar-section">
          <div className="toolbar-divider" />
          <span className="status-text">{status}</span>
          <div className="toolbar-divider" />
          <button onClick={handleConvert} className="btn"><RefreshCw size={15} /><span>Convert</span></button>
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

        {/* EDITOR */}
        <div className="editor-wrapper">
          <div className="editor-container">
            <div ref={editorRef} className="ms-editor-div" style={{ minHeight: '500px' }} />
            {loading && (
              <div className="loading-overlay">
                <div className="loading-text">Connecting to handwriting engine...</div>
              </div>
            )}
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomIn}><ZoomIn size={16} /></button>
              <div className="zoom-label">{zoom}%</div>
              <button className="zoom-btn" onClick={handleZoomOut}><ZoomOut size={16} /></button>
            </div>
          </div>
          <div className="page-indicator">Page {currentPage} of {pages.length}</div>
        </div>

      </div>
    </div>
  );
};

export default App;
