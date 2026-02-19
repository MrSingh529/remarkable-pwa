import React, { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore
import * as iink from 'iink-js';
import {
  Square, Type, Calculator, Download, Trash2,
  RefreshCw, Undo2, Redo2, Plus, ChevronLeft,
  ChevronRight, FileText
} from 'lucide-react';
import './App.css';

const MYSCRIPT_APP_KEY = '625e304c-1a74-427d-be4e-465763e7e0af';
const MYSCRIPT_HMAC_KEY = '3e0d9a2c-8c4c-4706-ac0c-fb6b9c66bd8d';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Page {
  id: number;
  label: string;
}

const App: React.FC = () => {
  const editorRef       = useRef<HTMLDivElement>(null);
  const editorInstance  = useRef<any>(null);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [activeMode,  setActiveMode]  = useState<'TEXT' | 'MATH' | 'DIAGRAM'>('TEXT');
  const [status,      setStatus]      = useState('Initializing...');
  const [penSize,     setPenSize]     = useState<'S' | 'M' | 'L'>('M');
  const [pages,       setPages]       = useState<Page[]>([{ id: 1, label: 'Page 1' }]);
  const [currentPage, setCurrentPage] = useState(0); // index
  const [saveStatus,  setSaveStatus]  = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // ─── Pen size → line width map ───────────────────────────────────────────────
  const penSizeMap = { S: 1, M: 2.5, L: 5 };

  // ─── Init / Re-init editor ───────────────────────────────────────────────────
  const initEditor = useCallback(() => {
    if (!editorRef.current) return;

    // Kill previous instance
    if (editorInstance.current) {
      editorInstance.current.close();
      editorInstance.current = null;
    }

    if (editorRef.current.clientHeight < 10) {
      setTimeout(initEditor, 100);
      return;
    }

    try {
      const config = {
        recognitionParams: {
          type: activeMode,
          protocol: 'WEBSOCKET',
          server: {
            applicationKey: MYSCRIPT_APP_KEY,
            hmacKey:        MYSCRIPT_HMAC_KEY,
          },
          iink: {
            export: { jiix: { strokes: true } },
            renderer: {
              guides: { enable: false }
            }
          }
        }
      };

      editorInstance.current = iink.register(editorRef.current, config);

      // Apply pen size
      if (editorInstance.current.penStyle !== undefined) {
        editorInstance.current.penStyle = {
          '-myscript-pen-width': penSizeMap[penSize]
        };
      }

      setStatus('Ready — write something!');
      setSaveStatus('saved');

    } catch (err) {
      console.error(err);
      setStatus('Error loading editor.');
    }
  }, [activeMode, penSize, currentPage]); // re-init when page or mode changes

  // ─── Mount + resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(initEditor, 200);

    const handleResize = () => editorInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      editorInstance.current?.close();
      editorInstance.current = null;
    };
  }, [initEditor]);

  // ─── Auto-save simulation (marks unsaved on stroke) ──────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === 'unsaved') {
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 800);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [saveStatus]);

  // ─── Toolbar Handlers ────────────────────────────────────────────────────────
  const handleUndo = () => {
    editorInstance.current?.undo();
    setSaveStatus('unsaved');
  };

  const handleRedo = () => {
    editorInstance.current?.redo();
    setSaveStatus('unsaved');
  };

  const handleClear = () => {
    editorInstance.current?.clear();
    setStatus('Canvas cleared');
    setSaveStatus('unsaved');
  };

  const handleConvert = () => {
    editorInstance.current?.convert();
    setStatus('Converting...');
  };

  const handleExport = async () => {
    if (!editorInstance.current) return;
    try {
      const result = await editorInstance.current.export_(['application/vnd.myscript.jiix']);
      console.log(result);
      alert('Export successful! Check console.');
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Pen Size Change ─────────────────────────────────────────────────────────
  const handlePenSize = (size: 'S' | 'M' | 'L') => {
    setPenSize(size);
    if (editorInstance.current) {
      editorInstance.current.penStyle = {
        '-myscript-pen-width': penSizeMap[size]
      };
    }
  };

  // ─── Page Handlers ───────────────────────────────────────────────────────────
  const handleAddPage = () => {
    const newPage: Page = {
      id:    pages.length + 1,
      label: `Page ${pages.length + 1}`
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPage(pages.length); // go to new page
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1);
  };

  const handleDeletePage = () => {
    if (pages.length === 1) {
      handleClear(); // Can't delete last page, just clear it
      return;
    }
    setPages(prev => prev.filter((_, i) => i !== currentPage));
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  // ─── Mode Change ─────────────────────────────────────────────────────────────
  const handleModeChange = (mode: 'TEXT' | 'MATH' | 'DIAGRAM') => {
    setActiveMode(mode);
    setStatus(`Mode: ${mode}`);
  };

  // ─── Save indicator color ────────────────────────────────────────────────────
  const saveColor = {
    saved:   '#16a34a',
    saving:  '#d97706',
    unsaved: '#dc2626'
  }[saveStatus];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">

      {/* ── TOP TOOLBAR ─────────────────────────────────────────────────────── */}
      <div className="toolbar">

        {/* Left: Mode Buttons */}
        <div className="toolbar-group">
          <button
            onClick={() => handleModeChange('TEXT')}
            className={`btn ${activeMode === 'TEXT' ? 'active-text' : ''}`}
            title="Text recognition"
          >
            <Type size={16} /><span>Text</span>
          </button>
          <button
            onClick={() => handleModeChange('MATH')}
            className={`btn ${activeMode === 'MATH' ? 'active-math' : ''}`}
            title="Math recognition"
          >
            <Calculator size={16} /><span>Math</span>
          </button>
          <button
            onClick={() => handleModeChange('DIAGRAM')}
            className={`btn ${activeMode === 'DIAGRAM' ? 'active-diagram' : ''}`}
            title="Diagram / shapes recognition"
          >
            <Square size={16} /><span>Diagram</span>
          </button>
        </div>

        {/* Center: Status + Save */}
        <div className="toolbar-center">
          <div className="status-text">{status}</div>
          <div className="save-indicator" style={{ color: saveColor }}>
            ● {saveStatus}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="toolbar-group">

          {/* Pen Size */}
          <div className="pen-size-group">
            {(['S', 'M', 'L'] as const).map(size => (
              <button
                key={size}
                onClick={() => handlePenSize(size)}
                className={`btn pen-btn ${penSize === size ? 'pen-active' : ''}`}
                title={`Pen size ${size}`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Undo / Redo */}
          <button onClick={handleUndo}    className="btn" title="Undo"><Undo2   size={16} /></button>
          <button onClick={handleRedo}    className="btn" title="Redo"><Redo2   size={16} /></button>

          {/* Convert / Export / Clear */}
          <button onClick={handleConvert} className="btn btn-convert" title="Convert handwriting">
            <RefreshCw size={16} /><span>Convert</span>
          </button>
          <button onClick={handleExport}  className="btn btn-export"  title="Export JSON">
            <Download  size={16} /><span>Export</span>
          </button>
          <button onClick={handleClear}   className="btn btn-clear"   title="Clear page">
            <Trash2    size={16} />
          </button>
        </div>
      </div>

      {/* ── EDITOR ──────────────────────────────────────────────────────────── */}
      <div className="editor-container">
        <div
          ref={editorRef}
          className="ms-editor-div"
          style={{ minHeight: '500px' }}
          onPointerDown={() => setSaveStatus('unsaved')}
        />
      </div>

      {/* ── BOTTOM PAGE BAR ─────────────────────────────────────────────────── */}
      <div className="page-bar">
        <button
          onClick={handlePrevPage}
          className="btn page-btn"
          disabled={currentPage === 0}
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="page-info">
          <FileText size={14} />
          <span>{pages[currentPage]?.label} of {pages.length}</span>
        </div>

        <button
          onClick={handleNextPage}
          className="btn page-btn"
          disabled={currentPage === pages.length - 1}
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>

        <button onClick={handleAddPage} className="btn page-btn add-page-btn" title="Add new page">
          <Plus size={16} /><span>Add Page</span>
        </button>

        <button
          onClick={handleDeletePage}
          className="btn btn-clear page-btn"
          title={pages.length === 1 ? 'Clear page' : 'Delete page'}
        >
          <Trash2 size={14} />
          <span>{pages.length === 1 ? 'Clear' : 'Delete Page'}</span>
        </button>
      </div>

    </div>
  );
};

export default App;
