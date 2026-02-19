import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import * as iink from 'iink-js';
import { Square, Type, Calculator, Download, Trash2, RefreshCw } from 'lucide-react';
import './App.css'; 

const MYSCRIPT_APP_KEY = '625e304c-1a74-427d-be4e-465763e7e0af';
const MYSCRIPT_HMAC_KEY = '3e0d9a2c-8c4c-4706-ac0c-fb6b9c66bd8d';

const App: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null); // Keep reference outside state to prevent stale closures
  const [activeMode, setActiveMode] = useState<'TEXT' | 'MATH' | 'DIAGRAM'>('TEXT');
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    // CLEANUP: If an editor exists, kill it first
    if (editorInstance.current) {
      editorInstance.current.close();
      editorInstance.current = null;
    }

    const initEditor = () => {
      if (!editorRef.current) return;
      
      // Wait for layout
      if (editorRef.current.clientHeight < 10) {
        setTimeout(initEditor, 100);
        return;
      }

      try {
        const config = {
          recognitionParams: {
            type: 'TEXT',
            protocol: 'WEBSOCKET',
            server: {
              applicationKey: MYSCRIPT_APP_KEY,
              hmacKey: MYSCRIPT_HMAC_KEY,
            },
            iink: {
              export: {
                jiix: { strokes: true }
              }
            }
          }
        };

        // Create new instance
        editorInstance.current = iink.register(editorRef.current, config);
        setStatus('Ready - Write something!');

        window.addEventListener('resize', handleResize);
      } catch (err) {
        console.error(err);
        setStatus('Error loading editor.');
      }
    };

    const handleResize = () => {
      if (editorInstance.current) {
        editorInstance.current.resize();
      }
    };

    // Delay init slightly to let DOM settle
    const timer = setTimeout(initEditor, 200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (editorInstance.current) {
        editorInstance.current.close();
        editorInstance.current = null;
      }
    };
  }, []); // Run once on mount

  // Handle Mode Switching
  useEffect(() => {
    if (editorInstance.current && editorInstance.current.configuration) {
      const newConfig = { ...editorInstance.current.configuration };
      newConfig.recognitionParams.type = activeMode;
      editorInstance.current.configuration = newConfig;
      setStatus(`Mode switched to ${activeMode}`);
    }
  }, [activeMode]);

  const handleClear = () => { 
    editorInstance.current?.clear(); 
    setStatus('Canvas cleared'); 
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
    } catch (e) { console.error(e); }
  };

  return (
    <div className="app-container">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button onClick={() => setActiveMode('TEXT')} className={`btn ${activeMode === 'TEXT' ? 'active-text' : ''}`}>
            <Type size={18} /> <span>Text</span>
          </button>
          <button onClick={() => setActiveMode('MATH')} className={`btn ${activeMode === 'MATH' ? 'active-math' : ''}`}>
            <Calculator size={18} /> <span>Math</span>
          </button>
          <button onClick={() => setActiveMode('DIAGRAM')} className={`btn ${activeMode === 'DIAGRAM' ? 'active-diagram' : ''}`}>
            <Square size={18} /> <span>Diagram</span>
          </button>
        </div>
        <div className="status-text">{status}</div>
        <div className="toolbar-group">
          <button onClick={handleConvert} className="btn btn-convert" title="Convert">
            <RefreshCw size={18} /> <span>Convert</span>
          </button>
          <button onClick={handleExport} className="btn btn-export" title="Export">
            <Download size={18} /> <span>Export</span>
          </button>
          <button onClick={handleClear} className="btn btn-clear" title="Clear">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="editor-container">
        <div ref={editorRef} className="ms-editor-div" style={{ minHeight: '500px' }} />
      </div>
    </div>
  );
};

export default App;