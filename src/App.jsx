import { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

function App() {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [quality, setQuality] = useState(85);
  const [originalSize, setOriginalSize] = useState(0);
  const [newSize, setNewSize] = useState(0);
  
  // Image enhancement filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // Multiple focus points
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [focusPoints, setFocusPoints] = useState([]);
  const [focusSize, setFocusSize] = useState(25);
  const [blurStrength, setBlurStrength] = useState(10);
  const [draggingFocus, setDraggingFocus] = useState(null);
  
  // Text overlays
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedText, setSelectedText] = useState(null);
  const [draggingText, setDraggingText] = useState(null);
  
  // Arrows
  const [arrows, setArrows] = useState([]);
  const [selectedArrow, setSelectedArrow] = useState(null);
  const [draggingArrow, setDraggingArrow] = useState(null);
  const [arrowDragPoint, setArrowDragPoint] = useState(null); // 'start' or 'end'
  
  // Mode toggle
  const [editMode, setEditMode] = useState('crop'); // 'crop', 'focus', 'text', or 'arrow'
  
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Handle image upload
  function onSelectFile(e) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOriginalSize((file.size / (1024 * 1024)).toFixed(2));
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setFocusPoints([]);
        setTextOverlays([]);
        setArrows([]);
        setCompletedCrop(null);
      });
      reader.readAsDataURL(file);
    }
  }

  // Add focus point on image click (only in focus mode)
  function handleImageClick(e) {
    if (editMode === 'focus' && focusEnabled && imgRef.current) {
      if (e.target.tagName === 'DIV') return;
      
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      if (focusPoints.length < 5) {
        setFocusPoints([...focusPoints, { x, y, id: Date.now() }]);
      }
    }
    
    // Add text on image click (only in text mode)
    if (editMode === 'text' && imgRef.current && e.target === imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const newText = {
        id: Date.now(),
        text: 'Imagine yourself having this',
        x,
        y,
        fontSize: 24,
        color: '#FFFFFF',
        gradient: null,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        rotation: 0
      };
      
      setTextOverlays([...textOverlays, newText]);
      setSelectedText(newText.id);
    }

    // Add arrow on image click (only in arrow mode)
    if (editMode === 'arrow' && imgRef.current && e.target === imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const newArrow = {
        id: Date.now(),
        startX: x,
        startY: y,
        endX: x + 15,
        endY: y - 10,
        color: '#FF0000',
        thickness: 3,
        style: 'solid'
      };
      
      setArrows([...arrows, newArrow]);
      setSelectedArrow(newArrow.id);
    }
  }

  // Handle focus point drag start
  function handleFocusMouseDown(e, focusId) {
    e.stopPropagation();
    setDraggingFocus(focusId);
  }

  // Handle focus point dragging
  function handleFocusMouseMove(e) {
    if (draggingFocus && imgRef.current && editMode === 'focus') {
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));
      
      setFocusPoints(focusPoints.map(point =>
        point.id === draggingFocus ? { ...point, x: clampedX, y: clampedY } : point
      ));
    }
  }

  // Handle focus point drag end
  function handleFocusMouseUp() {
    setDraggingFocus(null);
  }

  // Handle text drag start
  function handleTextMouseDown(e, textId) {
    e.stopPropagation();
    setDraggingText(textId);
    setSelectedText(textId);
  }

  // Handle text dragging
  function handleMouseMove(e) {
    if (draggingText && imgRef.current && editMode === 'text') {
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));
      
      updateTextOverlay(draggingText, { x: clampedX, y: clampedY });
    }
  }

  // Handle text drag end
  function handleMouseUp() {
    setDraggingText(null);
  }

  // Handle arrow drag start
  function handleArrowMouseDown(e, arrowId, point) {
    e.stopPropagation();
    setDraggingArrow(arrowId);
    setArrowDragPoint(point);
    setSelectedArrow(arrowId);
  }

  // Handle arrow dragging
  function handleArrowMouseMove(e) {
    if (draggingArrow && imgRef.current && editMode === 'arrow') {
      const rect = imgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));
      
      setArrows(arrows.map(arrow => {
        if (arrow.id === draggingArrow) {
          if (arrowDragPoint === 'start') {
            return { ...arrow, startX: clampedX, startY: clampedY };
          } else if (arrowDragPoint === 'end') {
            return { ...arrow, endX: clampedX, endY: clampedY };
          }
        }
        return arrow;
      }));
    }
  }

  // Handle arrow drag end
  function handleArrowMouseUp() {
    setDraggingArrow(null);
    setArrowDragPoint(null);
  }

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (draggingText || draggingFocus || draggingArrow) {
      const handleMove = (e) => {
        handleMouseMove(e);
        handleFocusMouseMove(e);
        handleArrowMouseMove(e);
      };
      const handleUp = () => {
        handleMouseUp();
        handleFocusMouseUp();
        handleArrowMouseUp();
      };
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [draggingText, draggingFocus, draggingArrow, focusPoints, textOverlays, arrows]);

  // Remove a focus point
  function removeFocusPoint(id) {
    setFocusPoints(focusPoints.filter(point => point.id !== id));
  }

  // Clear all focus points
  function clearAllFocusPoints() {
    setFocusPoints([]);
  }

  // Update text overlay
  function updateTextOverlay(id, updates) {
    setTextOverlays(textOverlays.map(text => 
      text.id === id ? { ...text, ...updates } : text
    ));
  }

  // Remove text overlay
  function removeTextOverlay(id) {
    setTextOverlays(textOverlays.filter(text => text.id !== id));
    if (selectedText === id) setSelectedText(null);
  }

  // Clear all text overlays
  function clearAllTextOverlays() {
    setTextOverlays([]);
    setSelectedText(null);
  }

  // Update arrow
  function updateArrow(id, updates) {
    setArrows(arrows.map(arrow => 
      arrow.id === id ? { ...arrow, ...updates } : arrow
    ));
  }

  // Remove arrow
  function removeArrow(id) {
    setArrows(arrows.filter(arrow => arrow.id !== id));
    if (selectedArrow === id) setSelectedArrow(null);
  }

  // Clear all arrows
  function clearAllArrows() {
    setArrows([]);
    setSelectedArrow(null);
  }

  // Generate preview with filters, focus points, text overlays, and arrows
  function generatePreview() {
    if (!imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    
    const crop = completedCrop || {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    };

    if (!crop.width || !crop.height || crop.width <= 0 || crop.height <= 0) {
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    if (canvas.width <= 0 || canvas.height <= 0) {
      return;
    }

    if (focusEnabled && focusPoints.length > 0) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = crop.width * scaleX;
      tempCanvas.height = crop.height * scaleY;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.filter = `blur(${blurStrength}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      tempCtx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      
      focusPoints.forEach(point => {
        const focusCenterX = (point.x / 100) * canvas.width;
        const focusCenterY = (point.y / 100) * canvas.height;
        const focusRadius = (focusSize / 100) * Math.min(canvas.width, canvas.height);

        const gradient = ctx.createRadialGradient(
          focusCenterX, focusCenterY, focusRadius * 0.4,
          focusCenterX, focusCenterY, focusRadius
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.6, 'rgba(0,0,0,0.8)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      ctx.globalCompositeOperation = 'destination-over';
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    ctx.filter = 'none';

    // Draw arrows
    arrows.forEach(arrowObj => {
      const startX = (arrowObj.startX / 100) * canvas.width;
      const startY = (arrowObj.startY / 100) * canvas.height;
      const endX = (arrowObj.endX / 100) * canvas.width;
      const endY = (arrowObj.endY / 100) * canvas.height;
      
      ctx.strokeStyle = arrowObj.color;
      ctx.lineWidth = arrowObj.thickness;
      ctx.lineCap = 'round';
      
      if (arrowObj.style === 'dashed') {
        ctx.setLineDash([10, 5]);
      } else {
        ctx.setLineDash([]);
      }
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw arrowhead
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 20;
      const arrowAngle = Math.PI / 6;
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
      
      ctx.setLineDash([]);
    });

    // Draw text overlays
    textOverlays.forEach(textObj => {
      const textX = (textObj.x / 100) * canvas.width;
      const textY = (textObj.y / 100) * canvas.height;
      
      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate((textObj.rotation * Math.PI) / 180);
      
      ctx.font = `${textObj.fontWeight} ${textObj.fontSize * (canvas.width / 500)}px ${textObj.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (textObj.gradient) {
        const gradient = ctx.createLinearGradient(-200, 0, 200, 0);
        const colors = textObj.gradient.match(/#[0-9A-Fa-f]{6}/g) || [];
        if (colors.length > 0) {
          colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
          });
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = '#FFFFFF';
        }
      } else {
        ctx.fillStyle = textObj.color;
      }
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillText(textObj.text, 0, 0);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.restore();
    });

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setNewSize((blob.size / (1024 * 1024)).toFixed(2));
        }
      },
      'image/webp',
      quality / 100
    );
  }

  // Download the cropped and compressed image
  function downloadImage() {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Failed to create blob');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-image-${Date.now()}.webp`;
        a.click();
        URL.revokeObjectURL(url);
      },
      'image/webp',
      quality / 100
    );
  }

  // Reset all filters
  function resetFilters() {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFocusEnabled(false);
    setFocusPoints([]);
    setFocusSize(25);
    setBlurStrength(10);
  }

  // Update preview when image loads
  useEffect(() => {
    if (imgRef.current && imgSrc) {
      const img = imgRef.current;
      if (img.complete) {
        generatePreview();
      } else {
        img.onload = () => {
          generatePreview();
        };
      }
    }
  }, [imgSrc]);

  // Update preview when anything changes
  useEffect(() => {
    if (imgRef.current && imgSrc) {
      generatePreview();
    }
  }, [completedCrop, quality, brightness, contrast, saturation, focusEnabled, focusPoints, focusSize, blurStrength, textOverlays, arrows]);

  // Get filter style for live preview
  const getFilterStyle = () => {
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
      cursor: editMode === 'focus' && focusEnabled ? 'crosshair' : 
              editMode === 'text' ? 'text' : 
              editMode === 'arrow' ? 'crosshair' : 'default'
    };
  };

  const selectedTextObj = textOverlays.find(t => t.id === selectedText);
  const selectedArrowObj = arrows.find(a => a.id === selectedArrow);

  return (
    <div className="app">
      <div className="container">
        <h1>🖼️ Product Image Crop & Compress</h1>
        <p className="subtitle">Remove logos, enhance colors, add focus points, add text, and compress to WebP</p>

        <div className="upload-section">
          <input
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            id="fileInput"
            style={{ display: 'none' }}
          />
          <label htmlFor="fileInput" className="upload-btn">
            📁 Choose Image
          </label>
        </div>

        {imgSrc && (
          <>
            {/* Mode Toggle Buttons */}
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${editMode === 'crop' ? 'active' : ''}`}
                onClick={() => setEditMode('crop')}
              >
                ✂️ Crop
              </button>
              <button 
                className={`mode-btn ${editMode === 'focus' ? 'active' : ''}`}
                onClick={() => setEditMode('focus')}
              >
                🎯 Focus
              </button>
              <button 
                className={`mode-btn ${editMode === 'text' ? 'active' : ''}`}
                onClick={() => setEditMode('text')}
              >
                📝 Text
              </button>
              <button 
                className={`mode-btn ${editMode === 'arrow' ? 'active' : ''}`}
                onClick={() => setEditMode('arrow')}
              >
                ➡️ Arrow
              </button>
            </div>

            <div className="editor-section">
              <div className="crop-container" ref={containerRef}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {editMode === 'crop' ? (
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => {
                        setCompletedCrop(c);
                      }}
                      aspect={undefined}
                    >
                      <img
                        ref={imgRef}
                        src={imgSrc}
                        alt="Upload"
                        style={{ maxWidth: '100%', display: 'block', ...getFilterStyle() }}
                      />
                    </ReactCrop>
                  ) : (
                    <>
                      <img
                        ref={imgRef}
                        src={imgSrc}
                        alt="Upload"
                        style={{ maxWidth: '100%', display: 'block', ...getFilterStyle() }}
                        onClick={handleImageClick}
                      />
                      {completedCrop && imgRef.current && (
                        <div style={{
                          position: 'absolute',
                          left: `${(completedCrop.x / imgRef.current.width) * 100}%`,
                          top: `${(completedCrop.y / imgRef.current.height) * 100}%`,
                          width: `${(completedCrop.width / imgRef.current.width) * 100}%`,
                          height: `${(completedCrop.height / imgRef.current.height) * 100}%`,
                          border: '2px dashed rgba(102, 126, 234, 0.5)',
                          pointerEvents: 'none'
                        }} />
                      )}
                    </>
                  )}
                  
                  {/* Render focus point indicators - DRAGGABLE */}
                  {focusEnabled && focusPoints.map((point, index) => {
                    if (!imgRef.current) return null;
                    
                    return (
                      <div
                        key={point.id}
                        onMouseDown={(e) => handleFocusMouseDown(e, point.id)}
                        style={{
                          position: 'absolute',
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${focusSize}%`,
                          height: `${focusSize}%`,
                          border: '3px dashed #667eea',
                          borderRadius: '50%',
                          pointerEvents: editMode === 'focus' ? 'auto' : 'none',
                          zIndex: 1000,
                          cursor: editMode === 'focus' ? (draggingFocus === point.id ? 'grabbing' : 'grab') : 'default',
                          transition: draggingFocus === point.id ? 'none' : 'all 0.1s ease'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '14px',
                          height: '14px',
                          background: '#667eea',
                          borderRadius: '50%',
                          border: '3px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          pointerEvents: 'none'
                        }}>
                          <span style={{
                            position: 'absolute',
                            top: '-28px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#667eea',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            pointerEvents: 'none'
                          }}>
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Render arrows - DRAGGABLE */}
                  {arrows.map((arrowObj) => {
                    if (!imgRef.current) return null;
                    
                    return (
                      <svg
                        key={arrowObj.id}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none',
                          zIndex: 998
                        }}
                      >
                        <defs>
                          <marker
                            id={`arrowhead-${arrowObj.id}`}
                            markerWidth="10"
                            markerHeight="10"
                            refX="9"
                            refY="3"
                            orient="auto"
                          >
                            <polygon
                              points="0 0, 10 3, 0 6"
                              fill={arrowObj.color}
                            />
                          </marker>
                        </defs>
                        <line
                          x1={`${arrowObj.startX}%`}
                          y1={`${arrowObj.startY}%`}
                          x2={`${arrowObj.endX}%`}
                          y2={`${arrowObj.endY}%`}
                          stroke={arrowObj.color}
                          strokeWidth={arrowObj.thickness}
                          strokeDasharray={arrowObj.style === 'dashed' ? '10,5' : '0'}
                          markerEnd={`url(#arrowhead-${arrowObj.id})`}
                        />
                        {editMode === 'arrow' && (
                          <>
                            <circle
                              cx={`${arrowObj.startX}%`}
                              cy={`${arrowObj.startY}%`}
                              r="8"
                              fill="white"
                              stroke={selectedArrow === arrowObj.id ? '#667eea' : '#999'}
                              strokeWidth="2"
                              style={{ 
                                cursor: 'grab',
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => handleArrowMouseDown(e, arrowObj.id, 'start')}
                            />
                            <circle
                              cx={`${arrowObj.endX}%`}
                              cy={`${arrowObj.endY}%`}
                              r="8"
                              fill="white"
                              stroke={selectedArrow === arrowObj.id ? '#667eea' : '#999'}
                              strokeWidth="2"
                              style={{ 
                                cursor: 'grab',
                                pointerEvents: 'auto'
                              }}
                              onMouseDown={(e) => handleArrowMouseDown(e, arrowObj.id, 'end')}
                            />
                          </>
                        )}
                      </svg>
                    );
                  })}

                  {/* Render text overlays - DRAGGABLE with ROTATION */}
                  {textOverlays.map((textObj) => {
                    if (!imgRef.current) return null;
                    
                    const textStyle = textObj.gradient 
                      ? {
                          background: textObj.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }
                      : {
                          color: textObj.color,
                        };
                    
                    return (
                      <div
                        key={textObj.id}
                        onMouseDown={(e) => handleTextMouseDown(e, textObj.id)}
                        style={{
                          position: 'absolute',
                          left: `${textObj.x}%`,
                          top: `${textObj.y}%`,
                          transform: `translate(-50%, -50%) rotate(${textObj.rotation}deg)`,
                          fontSize: `${textObj.fontSize}px`,
                          fontWeight: textObj.fontWeight,
                          fontFamily: textObj.fontFamily,
                          textAlign: 'center',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          cursor: editMode === 'text' ? (draggingText === textObj.id ? 'grabbing' : 'grab') : 'default',
                          pointerEvents: editMode === 'text' ? 'auto' : 'none',
                          zIndex: 999,
                          border: selectedText === textObj.id ? '2px dashed #667eea' : '2px dashed transparent',
                          padding: '5px 10px',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                          transition: draggingText === textObj.id ? 'none' : 'all 0.1s ease',
                          ...textStyle
                        }}
                      >
                        {textObj.text}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="controls">
                {editMode === 'arrow' && (
                  <>
                    <h3 className="section-title">➡️ Arrows</h3>
                    
                    <div className="toggle-group">
                      <p className="hint">
                        👆 Click on image to add arrow • Drag endpoints to adjust ({arrows.length} added)
                      </p>
                    </div>

                    {arrows.length > 0 && (
                      <div className="focus-points-list">
                        <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#666' }}>
                          Arrow Elements:
                        </p>
                        {arrows.map((arrowObj, index) => (
                          <div 
                            key={arrowObj.id} 
                            className={`focus-point-item ${selectedArrow === arrowObj.id ? 'selected' : ''}`}
                            onClick={() => setSelectedArrow(arrowObj.id)}
                          >
                            <span>Arrow #{index + 1}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeArrow(arrowObj.id);
                              }}
                              className="remove-point-btn"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button onClick={clearAllArrows} className="clear-all-btn">
                          Clear All Arrows
                        </button>
                      </div>
                    )}

                    {selectedArrowObj && (
                      <div className="text-editor">
                        <div className="control-group">
                          <label>Arrow Color:</label>
                          <div className="color-palette">
                            {[
                              '#FF0000', '#FF8C00', '#FFD700', '#00FF00', '#0000FF',
                              '#FF00FF', '#00FFFF', '#FFFFFF', '#000000', '#808080'
                            ].map(color => (
                              <div
                                key={color}
                                onClick={() => updateArrow(selectedArrow, { color })}
                                className={`color-swatch ${selectedArrowObj.color === color ? 'selected' : ''}`}
                                style={{ background: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="control-group">
                          <label>Thickness: <strong>{selectedArrowObj.thickness}px</strong></label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={selectedArrowObj.thickness}
                            onChange={(e) => updateArrow(selectedArrow, { thickness: Number(e.target.value) })}
                            className="slider"
                          />
                        </div>

                        <div className="control-group">
                          <label>Style:</label>
                          <select
                            value={selectedArrowObj.style}
                            onChange={(e) => updateArrow(selectedArrow, { style: e.target.value })}
                            className="select-input"
                          >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {editMode === 'text' && (
                  <>
                    <h3 className="section-title">📝 Text Overlays</h3>
                    
                    <div className="toggle-group">
                      <p className="hint">
                        👆 Click on image to add text • Drag text to move ({textOverlays.length} added)
                      </p>
                    </div>

                    {textOverlays.length > 0 && (
                      <div className="focus-points-list">
                        <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#666' }}>
                          Text Elements:
                        </p>
                        {textOverlays.map((textObj, index) => (
                          <div 
                            key={textObj.id} 
                            className={`focus-point-item ${selectedText === textObj.id ? 'selected' : ''}`}
                            onClick={() => setSelectedText(textObj.id)}
                          >
                            <span>Text #{index + 1}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTextOverlay(textObj.id);
                              }}
                              className="remove-point-btn"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button onClick={clearAllTextOverlays} className="clear-all-btn">
                          Clear All Text
                        </button>
                      </div>
                    )}

                    {selectedTextObj && (
                      <div className="text-editor">
                        <div className="control-group">
                          <label>Text Content:</label>
                          <textarea
                            value={selectedTextObj.text}
                            onChange={(e) => updateTextOverlay(selectedText, { text: e.target.value })}
                            className="text-input"
                            rows="2"
                          />
                        </div>

                        <div className="control-group">
                          <label>Font Size: <strong>{selectedTextObj.fontSize}px</strong></label>
                          <input
                            type="range"
                            min="12"
                            max="72"
                            value={selectedTextObj.fontSize}
                            onChange={(e) => updateTextOverlay(selectedText, { fontSize: Number(e.target.value) })}
                            className="slider"
                          />
                        </div>

                        <div className="control-group">
                          <label>Rotation: <strong>{selectedTextObj.rotation}°</strong></label>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={selectedTextObj.rotation}
                            onChange={(e) => updateTextOverlay(selectedText, { rotation: Number(e.target.value) })}
                            className="slider"
                          />
                        </div>

                        <div className="control-group">
                          <label>Text Color:</label>
                          
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Basic Colors:</p>
                            <div className="color-palette">
                              {[
                                '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
                                '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
                                '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
                              ].map(color => (
                                <div
                                  key={color}
                                  onClick={() => updateTextOverlay(selectedText, { color, gradient: null })}
                                  className={`color-swatch ${selectedTextObj.color === color && !selectedTextObj.gradient ? 'selected' : ''}`}
                                  style={{ background: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Gradient Colors:</p>
                            <div className="color-palette">
                              {[
                                { name: 'Orange-Blue', gradient: 'linear-gradient(90deg, #FF8C00, #1E90FF)' },
                                { name: 'Green-Violet', gradient: 'linear-gradient(90deg, #32CD32, #9370DB)' },
                                { name: 'Blue-Green', gradient: 'linear-gradient(90deg, #4169E1, #00FA9A)' },
                                { name: 'Red-Yellow', gradient: 'linear-gradient(90deg, #FF6347, #FFD700)' },
                                { name: 'Pink-Purple', gradient: 'linear-gradient(90deg, #FF1493, #8A2BE2)' },
                                { name: 'Cyan-Blue', gradient: 'linear-gradient(90deg, #00CED1, #000080)' },
                                { name: 'Sunset', gradient: 'linear-gradient(90deg, #FF4500, #FF69B4, #FFD700)' },
                                { name: 'Ocean', gradient: 'linear-gradient(90deg, #006994, #00D4FF, #7FFFD4)' },
                                { name: 'Fire', gradient: 'linear-gradient(90deg, #FF0000, #FF8C00, #FFD700)' },
                                { name: 'Forest', gradient: 'linear-gradient(90deg, #228B22, #ADFF2F, #32CD32)' },
                                { name: 'Royal', gradient: 'linear-gradient(90deg, #4B0082, #9370DB, #DDA0DD)' },
                                { name: 'Rainbow', gradient: 'linear-gradient(90deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)' }
                              ].map(item => (
                                <div
                                  key={item.name}
                                  onClick={() => updateTextOverlay(selectedText, { gradient: item.gradient, color: null })}
                                  className={`color-swatch ${selectedTextObj.gradient === item.gradient ? 'selected' : ''}`}
                                  style={{ background: item.gradient }}
                                  title={item.name}
                                />
                              ))}
                            </div>
                          </div>

                          <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px' }}>Current:</p>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px' 
                            }}>
                              <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '5px', 
                                border: '2px solid #ddd',
                                background: selectedTextObj.gradient || selectedTextObj.color 
                              }} />
                              <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                {selectedTextObj.gradient ? 'Gradient' : selectedTextObj.color}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="control-group">
                          <label>Font Weight:</label>
                          <select
                            value={selectedTextObj.fontWeight}
                            onChange={(e) => updateTextOverlay(selectedText, { fontWeight: e.target.value })}
                            className="select-input"
                          >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                          </select>
                        </div>

                        <div className="control-group">
                          <label>Font Family:</label>
                          <select
                            value={selectedTextObj.fontFamily}
                            onChange={(e) => updateTextOverlay(selectedText, { fontFamily: e.target.value })}
                            className="select-input"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                            <option value="Impact">Impact</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {editMode === 'focus' && (
                  <>
                    <h3 className="section-title">🎯 Multiple Focus Points</h3>
                    
                    <div className="toggle-group">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={focusEnabled}
                          onChange={(e) => setFocusEnabled(e.target.checked)}
                        />
                        <span>Enable Focus Effect</span>
                      </label>
                      {focusEnabled && (
                        <p className="hint">
                          👆 Click on image to add • Drag points to move ({focusPoints.length}/5)
                        </p>
                      )}
                    </div>

                    {focusEnabled && (
                      <>
                        <div className="focus-points-list">
                          {focusPoints.length > 0 ? (
                            <>
                              <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#666' }}>
                                Active Focus Points:
                              </p>
                              {focusPoints.map((point, index) => (
                                <div key={point.id} className="focus-point-item">
                                  <span>Point #{index + 1}</span>
                                  <button 
                                    onClick={() => removeFocusPoint(point.id)}
                                    className="remove-point-btn"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button onClick={clearAllFocusPoints} className="clear-all-btn">
                                Clear All Points
                              </button>
                            </>
                          ) : (
                            <p style={{ fontSize: '0.9rem', color: '#999', fontStyle: 'italic' }}>
                              No focus points added yet
                            </p>
                          )}
                        </div>

                        <div className="control-group">
                          <label>
                            🎯 Focus Area Size: <strong>{focusSize}%</strong>
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="50"
                            value={focusSize}
                            onChange={(e) => setFocusSize(Number(e.target.value))}
                            className="slider"
                          />
                        </div>

                        <div className="control-group">
                          <label>
                            💨 Background Blur: <strong>{blurStrength}px</strong>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="25"
                            value={blurStrength}
                            onChange={(e) => setBlurStrength(Number(e.target.value))}
                            className="slider"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                <h3 className="section-title">🎨 Image Enhancements</h3>
                
                <div className="control-group">
                  <label>
                    💡 Brightness: <strong>{brightness}%</strong>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="slider"
                  />
                </div>

                <div className="control-group">
                  <label>
                    ⚡ Contrast: <strong>{contrast}%</strong>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="slider"
                  />
                </div>

                <div className="control-group">
                  <label>
                    🎨 Saturation: <strong>{saturation}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="slider"
                  />
                </div>

                <button onClick={resetFilters} className="reset-btn">
                  🔄 Reset All Filters
                </button>

                <h3 className="section-title">📦 Compression</h3>

                <div className="control-group">
                  <label>
                    Quality: <strong>{quality}%</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="slider"
                  />
                </div>

                <div className="info-panel">
                  <div className="info-item">
                    <span className="label">Original Size:</span>
                    <span className="value">{originalSize} MB</span>
                  </div>
                  <div className="info-item">
                    <span className="label">New Size:</span>
                    <span className="value">{newSize} MB</span>
                  </div>
                  {originalSize > 0 && newSize > 0 && (
                    <div className="info-item">
                      <span className="label">Reduction:</span>
                      <span className="value success">
                        {((1 - newSize / originalSize) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                <button onClick={downloadImage} className="download-btn">
                  ⬇️ Download WebP
                </button>
              </div>
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default App;
