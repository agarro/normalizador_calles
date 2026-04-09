import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2, Download, AlertCircle, Loader2, Table as TableIcon, Layers, FileSpreadsheet, Database, X, BarChart3, PieChart as PieChartIcon, Info, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import streetsData from './streets.json';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Use environment variable for the API Key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

interface Row {
  [key: string]: any;
}

const AnalyticsModal = ({ results, selectedColumns, onClose }: { results: Row[], selectedColumns: string[], onClose: () => void }) => {
  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const COLORS = ['#38bdf8', '#10b981', '#f43f5e', '#fbbf24'];

  const analyticsData = selectedColumns.map(col => {
    let corrected = 0;
    let validated = 0;
    let empty = 0;
    const mutations: { [key: string]: number } = {};

    results.forEach(row => {
      const orig = String(row[col] || '').trim();
      const norm = String(row[col + '_normalizado'] || '').trim();
      
      if (!orig) {
        empty++;
      } else if (orig !== norm) {
        corrected++;
        const key = `${orig} → ${norm}`;
        mutations[key] = (mutations[key] || 0) + 1;
      } else {
        validated++;
      }
    });

    const topMutations = Object.entries(mutations)
      .map(([name, value]) => ({ 
        name: name.length > 40 ? name.substring(0, 37) + "..." : name, 
        fullName: name,
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const pieData = [
      { name: 'Corregidos', value: corrected },
      { name: 'Validados', value: validated },
      { name: 'Vacíos', value: empty },
    ];

    const total = corrected + validated + empty;

    return { col, pieData, topMutations, total, emptyRows: results.filter(r => !String(r[col] || '').trim()) };
  });

  const summaryData = analyticsData.map(d => ({
    name: d.col,
    corregidos: d.pieData[0].value,
    validados: d.pieData[1].value,
    vacios: d.pieData[2].value
  }));

  return (
    <div className="modal-overlay">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="modal-content"
      >
        <div className="modal-header flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '0.6rem', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
              <BarChart3 className="text-primary" size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white' }}>Analítica de Resultados</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '2px 0 0 0' }}>Estadísticas de normalización por columna</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Global Summary Chart */}
          <div className="stat-card" style={{ marginBottom: '3rem' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} /> Comparativa General de Columnas
            </h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }} />
                  <Bar dataKey="corregidos" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="validados" stackId="a" fill="#10b981" />
                  <Bar dataKey="vacios" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {analyticsData.map((data, idx) => (
            <div key={idx} style={{ marginBottom: '4rem' }} className="fade-in">
              <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem' }}>
                <div style={{ width: '3px', height: '22px', background: 'var(--primary)', borderRadius: '4px' }}></div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Columna: <span style={{ color: 'var(--primary)' }}>{data.col}</span></h3>
              </div>

              <div className="grid-2">
                <div className="stat-card">
                  <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChartIcon size={14} /> Distribución (N={data.total})
                  </h4>
                  <div style={{ height: '260px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={data.pieData} 
                          innerRadius={55} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          dataKey="value" 
                          stroke="none"
                          label={({ value, percent }) => `${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {data.pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="stat-card">
                  <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={14} /> Principales Cambios realizados
                  </h4>
                  <div style={{ height: '260px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topMutations} layout="vertical" margin={{ left: -10, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={150} 
                          tick={{ fill: '#94a3b8', fontSize: 8 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', fontSize: '10px' }}>
                                  <p className="font-bold text-white mb-1">{payload[0].payload.fullName}</p>
                                  <p style={{ color: '#38bdf8' }}>Frecuencia: {payload[0].value}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.08)', borderRadius: '20px', padding: '1.5rem' }}>
                <h4 style={{ color: '#fca5a5', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 1.2rem 0' }}>
                  <Info size={14} /> Reporte de Calidad: Valores Faltantes ({data.emptyRows.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: expandedCol === data.col ? '400px' : '60px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  {data.emptyRows.length > 0 ? (
                    data.emptyRows.map((_, rIdx) => (
                      <span key={rIdx} className="badge-red" style={{ fontSize: '0.6rem' }}>
                        FILA {results.indexOf(_) + 1}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>Excelente: No se encontraron campos vacíos en esta columna.</span>
                  )}
                </div>
                {data.emptyRows.length > 30 && (
                  <button 
                    onClick={() => setExpandedCol(expandedCol === data.col ? null : data.col)}
                    style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: '0.7rem', fontWeight: 700, marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {expandedCol === data.col ? "Ver menos" : `...y ${data.emptyRows.length - 30} más (Click para expandir)`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<Row[]>([]);
  const [originalData, setOriginalData] = useState<Row[]>([]);
  const [originalWbook, setOriginalWbook] = useState<XLSX.WorkBook | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      // Get headers from sheet range to ensure ABSOLUTELY all columns are shown
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const headers: string[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        headers.push(cell ? String(cell.v) : `Col_${C}`);
      }
      
      const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Row[];
      if (headers.length > 0) {
        setResults(null);
        setError(null);
        setProgress(0);
        setSelectedColumns([]); 
        setColumns(headers);
        setData(jsonData);
        setOriginalData(JSON.parse(JSON.stringify(jsonData)));
        setOriginalWbook(wb); // Store the full original workbook with all its glory
      }
    };
    reader.readAsBinaryString(f);
  };

  const processWithAI = async () => {
    if (selectedColumns.length === 0) {
      setError("Por favor, selecciona al menos una columna para normalizar.");
      return;
    }

    setIsProcessing(true);
    setResults(null); 
    setError(null);
    setProgress(0);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const allUniqueToNormalize = new Set<string>();
      data.forEach(row => {
        selectedColumns.forEach(col => {
          const val = String(row[col] || '').trim();
          if (val) allUniqueToNormalize.add(val);
        });
      });

      const uniqueList = Array.from(allUniqueToNormalize);
      const correctionsMap: { [key: string]: string } = {};
      const persistentCacheStr = localStorage.getItem('street_corrections_v1');
      const persistentCache: { [key: string]: string } = persistentCacheStr ? JSON.parse(persistentCacheStr) : {};

      const processedRef = streetsData.map(ref => ({
        original: ref,
        words: ref.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      }));

      const workerResult: { correctionsMap: any, toProcessWithAI: string[] } = await new Promise((resolve, reject) => {
        try {
          const worker = new Worker(new URL('./normalizationWorker.js', import.meta.url));
          worker.postMessage({ uniqueList, processedRef, persistentCache, streetsData });
          worker.onmessage = (e) => {
            resolve(e.data);
            worker.terminate();
          };
          worker.onerror = (err) => reject(err);
        } catch (e) {
          reject(e);
        }
      });

      Object.assign(correctionsMap, workerResult.correctionsMap);
      const toProcessWithAI = workerResult.toProcessWithAI;

      if (toProcessWithAI.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < toProcessWithAI.length; i += batchSize) {
          const batch = toProcessWithAI.slice(i, i + batchSize);
          const candidates = new Set<string>();
          
          batch.forEach(target => {
            const tWords = String(target).toLowerCase().split(/\s+/).filter(w => w.length > 2);
            processedRef
              .map(item => ({ ref: item.original, score: (tWords.filter(w => item.words.includes(w)).length / Math.max(tWords.length, 1)) }))
              .filter(item => item.score > 0.4)
              .sort((a, b) => b.score - a.score)
              .slice(0, 15)
              .forEach(item => candidates.add(item.ref));
          });

          const prompt = `Normaliza estas calles: [${batch.join(', ')}]. Referencia: [${Array.from(candidates).join(', ')}]. Responde SOLO JSON: {"original": "oficial"}.`;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          try {
            const batchCorrections = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
            Object.assign(correctionsMap, batchCorrections);
            Object.assign(persistentCache, batchCorrections);
            localStorage.setItem('street_corrections_v1', JSON.stringify(persistentCache));
          } catch (e) { console.error("AI Parse Error", text); }
          
          setProgress(Math.round(((i + batchSize) / toProcessWithAI.length) * 100));
        }
      }

      const normalizedData = data.map(row => {
        const newRow = { ...row };
        selectedColumns.forEach(col => {
          const val = String(row[col] || '').trim();
          newRow[col + '_normalizado'] = correctionsMap[val] || val;
        });
        return newRow;
      });

      setResults(normalizedData);
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setError("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (!results || !originalWbook) {
      // Fallback al método original si no tenemos el workbook
      if (!results || !originalData) {
        alert("No hay resultados para exportar");
        return;
      }
      try {
        const headers = Object.keys(originalData[0] || {});
        const finalData = originalData.map((row, idx) => {
          const processed = results[idx];
          const newRow: any = {};
          headers.forEach(h => {
            if (selectedColumns.includes(h) && processed && processed[h + '_normalizado']) {
              newRow[h] = processed[h + '_normalizado'];
            } else {
              newRow[h] = row[h];
            }
          });
          return newRow;
        });

        const ws = XLSX.utils.json_to_sheet(finalData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Normalizado");
        
        const fileName = file ? file.name.replace(/\.[^/.]+$/, "") + "_normalizado.xlsx" : "datos_normalizados.xlsx";
        XLSX.writeFile(wb, fileName);
        return;
      } catch (e: any) {
        alert("Error al exportar: " + e.message);
        return;
      }
    }
    
    try {
      // Usar el workbook original y modificar las celdas directamente
      const wb = originalWbook;
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      // Obtener el rango de la hoja
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Obtener los headers de la primera fila
      const headers: string[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        headers.push(cell ? String(cell.v) : `Col_${C}`);
      }
      
      // Map de columna a índice
      const colIndexMap: { [key: string]: number } = {};
      headers.forEach((h, idx) => { colIndexMap[h] = idx; });
      
      // Actualizar las celdas con los valores normalizados
      results.forEach((processedRow, rowIdx) => {
        selectedColumns.forEach(col => {
          const colIdx = colIndexMap[col];
          if (colIdx !== undefined && processedRow[col + '_normalizado']) {
            const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx }); // +1 porque la fila 0 son headers
            if (ws[cellRef]) {
              ws[cellRef].v = processedRow[col + '_normalizado'];
            }
          }
        });
      });
      
      const fileName = file ? file.name.replace(/\.[^/.]+$/, "") + "_normalizado.xlsx" : "datos_normalizados.xlsx";
      XLSX.writeFile(wb, fileName);
    } catch (e: any) {
      alert("Error al exportar: " + e.message);
    }
  };

  return (
    <>
      <div className="glass-card fade-in">
      <header className="mb-10 text-center">
        <h1 className="premium-title" style={{ fontSize: '2.4rem' }}>Normalizador de Calles</h1>
        <p className="premium-subtitle" style={{ fontSize: '0.8rem', letterSpacing: '0.2rem' }}>Software de Inteligencia Geoespacial</p>
      </header>

      {!file ? (
        <section 
          className="upload-zone flex flex-col items-center justify-center text-center" 
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="relative inline-block mb-6">
            <Upload size={64} className="text-primary opacity-80" />
            <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full -z-10 animate-pulse"></div>
          </div>
          <p className="text-2xl font-bold mb-2">Central de Datos</p>
          <p className="text-sm text-slate-400 mb-8">Arrastra y suelta tu archivo Excel o CSV aquí</p>
          <button 
            type="button"
            className="btn-primary"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}
          >
            <FileSpreadsheet size={20} />
            Seleccionar Archivo
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv" 
            onChange={handleFileUpload}
          />
        </section>
      ) : !results ? (
        <div className="fade-in">
          <div className="selection-info-box">
            <div className="info-item">
              <div className="icon-wrap"><FileText size={20} /></div>
              <div className="flex flex-col">
                <span className="label-tiny">Archivo Cargado</span>
                <span className="val-bold">{file.name}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="icon-wrap"><Database size={20} /></div>
              <div className="flex flex-col">
                <span className="label-tiny">Registros en el lote</span>
                <span className="val-bold">{data.length} registros listos</span>
              </div>
            </div>
          </div>

          <div style={{ margin: '3rem 0 2rem' }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '2px' }}></div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Selección de Variable Crítica</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Elige las columnas que contienen nombres de calles para normalizar:
            </p>

            <div className="column-grid">
              {columns.map(col => (
                <div 
                  key={col}
                  onClick={() => {
                    if (selectedColumns.includes(col)) {
                      setSelectedColumns(selectedColumns.filter(c => c !== col));
                    } else {
                      setSelectedColumns([...selectedColumns, col]);
                    }
                  }}
                  className={`column-item ${selectedColumns.includes(col) ? 'active' : ''}`}
                >
                  {col}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={processWithAI}
              disabled={selectedColumns.length === 0 || isProcessing}
              className="btn-primary"
              style={{ width: '100%', maxWidth: '400px', opacity: (selectedColumns.length === 0 || isProcessing) ? 0.6 : 1 }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Sincronizando con IA... {progress}%
                </>
              ) : (
                <>
                  <TableIcon size={24} />
                  Comenzar Normalización
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <AlertCircle size={24} />
              <span style={{ fontWeight: 600 }}>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="fade-in">
          <div 
            className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-8 rounded-3xl border border-white/10" 
            style={{ marginBottom: '5rem' }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="text-emerald-400" size={24} />
                <h2 className="text-2xl font-bold text-white">Análisis Completado</h2>
              </div>
              <p className="text-sm text-slate-400">Procesado: <span className="text-primary font-mono">{file?.name}</span></p>
            </div>
            <div className="btn-group" style={{ marginBottom: '0' }}>
              <button 
                onClick={() => setShowAnalytics(true)}
                className="btn-primary" 
                style={{ 
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.85rem'
                }}
              >
                <BarChart3 size={18} />
                Analítica de resultados
              </button>
              <button 
                onClick={downloadExcel}
                className="btn-primary"
                style={{ 
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.85rem'
                }}
              >
                <Download size={18} />
                Exportar Normalizado
              </button>
            </div>
          </div>

          <div className="table-container rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40">
            <table>
              <thead>
                <tr>
                  {selectedColumns.map(col => (
                    <React.Fragment key={col}>
                      <th>{col} (Original)</th>
                      <th>{col} (Normalizado)</th>
                    </React.Fragment>
                  ))}
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    {selectedColumns.map(col => {
                      const orig = row[col];
                      const fixed = row[col + '_normalizado'];
                      return (
                        <React.Fragment key={col}>
                          <td className="text-slate-400 font-mono text-xs">{orig}</td>
                          <td className="font-bold text-primary">{fixed}</td>
                        </React.Fragment>
                      );
                    })}
                    <td>
                      <span className="status-badge status-success">Procesado</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => { setResults(null); setSelectedColumns([]); setFile(null); }}
              className="btn-primary"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}
            >
              Procesar nuevo lote de datos
            </button>
          </div>
        </div>
      )}
    </div>

      <AnimatePresence>
        {showAnalytics && results && (
          <AnalyticsModal 
            results={results} 
            selectedColumns={selectedColumns} 
            onClose={() => setShowAnalytics(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
