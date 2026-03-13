import React, { useState } from 'react';
import { Search, X, Upload, ZoomIn } from 'lucide-react';

const ItemInfoMaster = () => {
  const [formData, setFormData] = useState({
    product: '',
    itemCode: '',
    description: '',
    name: '',
    shortDescription: '',
    longDescription1: '',
    longDescription2: '',
    baseUOM: '',
    maxLoose: '',
    glCode: '',
    isStockService: 'stock',
    isBatchSerial: null,
    isGiftVoucher: false,
    isExtendedWarranty: false,
    isActive: true,
    photo: null
  });

  const [showBaseUOMModal, setShowBaseUOMModal] = useState(false);
  const [showGLCodeModal, setShowGLCodeModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [baseUOMSearch, setBaseUOMSearch] = useState('');
  const [glCodeSearch, setGLCodeSearch] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [baseUOMPage, setBaseUOMPage] = useState(1);
  const [glCodePage, setGLCodePage] = useState(1);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const ITEMS_PER_PAGE = 5;

  const baseUOMList = [
    { code: 'CAN', name: 'CAN' },
    { code: 'BTLS', name: 'BOTTLES' },
    { code: 'RMS', name: 'REAMS' },
    { code: 'MTR', name: 'METRES' },
    { code: 'CRTN', name: 'CARTONS' },
    { code: 'SHT', name: 'SHEETS' },
    { code: 'PKT', name: 'PACKET' },
    { code: 'KGS', name: 'KILOGRAMS' },
    { code: 'LTR', name: 'LITRES' },
    { code: 'BAGS', name: 'BAGS' }
  ];

  const glCodeList = [
    { code: 'GL001', name: 'Sales Revenue' },
    { code: 'GL002', name: 'Purchase' },
    { code: 'GL003', name: 'Inventory' },
    { code: 'GL004', name: 'Cost of Goods Sold' },
    { code: 'GL005', name: 'Expenses' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    if (name === 'description') updates.shortDescription = value;
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCheckboxChange = (name) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photo: null }));
    setPhotoPreview(null);
  };

  const handleImageZoom = (delta) => {
    setImageZoom(prev => {
      const newZoom = prev + delta;
      return Math.max(1, Math.min(5, newZoom));
    });
  };

  const handleMouseDown = (e) => {
    if (imageZoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ 
        x: e.clientX - imagePosition.x, 
        y: e.clientY - imagePosition.y 
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && imageZoom > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setImagePosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetImageZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    resetImageZoom();
  };

  const selectBaseUOM = (uom) => {
    setFormData(prev => ({ ...prev, baseUOM: uom.code }));
    setShowBaseUOMModal(false);
    setBaseUOMSearch('');
    setBaseUOMPage(1);
  };

  const clearBaseUOM = () => {
    setFormData(prev => ({ ...prev, baseUOM: '' }));
  };

  const selectGLCode = (code) => {
    setFormData(prev => ({ ...prev, glCode: code.code }));
    setShowGLCodeModal(false);
    setGLCodeSearch('');
    setGLCodePage(1);
  };

  const clearGLCode = () => {
    setFormData(prev => ({ ...prev, glCode: '' }));
  };

  const filteredBaseUOM = baseUOMList.filter(uom =>
    uom.code.toLowerCase().includes(baseUOMSearch.toLowerCase()) ||
    uom.name.toLowerCase().includes(baseUOMSearch.toLowerCase())
  );

  const filteredGLCode = glCodeList.filter(code =>
    code.code.toLowerCase().includes(glCodeSearch.toLowerCase()) ||
    code.name.toLowerCase().includes(glCodeSearch.toLowerCase())
  );

  const totalBaseUOMPages = Math.ceil(filteredBaseUOM.length / ITEMS_PER_PAGE);
  const totalGLCodePages = Math.ceil(filteredGLCode.length / ITEMS_PER_PAGE);
  
  const paginatedBaseUOM = filteredBaseUOM.slice(
    (baseUOMPage - 1) * ITEMS_PER_PAGE,
    baseUOMPage * ITEMS_PER_PAGE
  );
  
  const paginatedGLCode = filteredGLCode.slice(
    (glCodePage - 1) * ITEMS_PER_PAGE,
    glCodePage * ITEMS_PER_PAGE
  );

  const renderBaseUOMModal = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
          <span>Base UOM</span>
          <button onClick={() => { setShowBaseUOMModal(false); setBaseUOMPage(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input autoFocus placeholder="Enter Base UOM for Search" value={baseUOMSearch} onChange={e => { setBaseUOMSearch(e.target.value); setBaseUOMPage(1); }} style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBaseUOM.map((uom, i) => (
                <tr key={uom.code} onClick={() => selectBaseUOM(uom)} style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }} onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{uom.code}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{uom.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <button onClick={() => setBaseUOMPage(p => Math.max(1, p - 1))} disabled={baseUOMPage === 1} style={{ padding: '4px 12px', fontSize: 10, background: baseUOMPage === 1 ? '#e5e7eb' : '#3b82f6', color: baseUOMPage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: baseUOMPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {baseUOMPage} of {totalBaseUOMPages}</span>
          <button onClick={() => setBaseUOMPage(p => Math.min(totalBaseUOMPages, p + 1))} disabled={baseUOMPage === totalBaseUOMPages} style={{ padding: '4px 12px', fontSize: 10, background: baseUOMPage === totalBaseUOMPages ? '#e5e7eb' : '#3b82f6', color: baseUOMPage === totalBaseUOMPages ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: baseUOMPage === totalBaseUOMPages ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>

        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
      </div>
    </div>
  );

  const renderGLCodeModal = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
          <span>GL Code</span>
          <button onClick={() => { setShowGLCodeModal(false); setGLCodePage(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input autoFocus placeholder="Enter GL Code for Search" value={glCodeSearch} onChange={e => { setGLCodeSearch(e.target.value); setGLCodePage(1); }} style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGLCode.map((code, i) => (
                <tr key={code.code} onClick={() => selectGLCode(code)} style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }} onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{code.code}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{code.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <button onClick={() => setGLCodePage(p => Math.max(1, p - 1))} disabled={glCodePage === 1} style={{ padding: '4px 12px', fontSize: 10, background: glCodePage === 1 ? '#e5e7eb' : '#3b82f6', color: glCodePage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: glCodePage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {glCodePage} of {totalGLCodePages}</span>
          <button onClick={() => setGLCodePage(p => Math.min(totalGLCodePages, p + 1))} disabled={glCodePage === totalGLCodePages} style={{ padding: '4px 12px', fontSize: 10, background: glCodePage === totalGLCodePages ? '#e5e7eb' : '#3b82f6', color: glCodePage === totalGLCodePages ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: glCodePage === totalGLCodePages ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>

        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
      </div>
    </div>
  );

  const renderImageModal = () => (
    <div 
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} 
      onClick={closeImageModal}
    >
      <div 
        style={{ width: 700, maxWidth: '90%', height: 550, maxHeight: '85%', background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
          <span>Product Photo - Zoom: {imageZoom.toFixed(1)}x</span>
          <button onClick={closeImageModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f9fafb' }}>
          <button 
            onClick={() => handleImageZoom(-0.5)} 
            disabled={imageZoom <= 1}
            style={{ padding: '4px 12px', fontSize: 10, background: imageZoom <= 1 ? '#e5e7eb' : '#3b82f6', color: imageZoom <= 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: imageZoom <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            Zoom Out (-)
          </button>
          <button 
            onClick={resetImageZoom}
            style={{ padding: '4px 12px', fontSize: 10, background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            Reset (1x)
          </button>
          <button 
            onClick={() => handleImageZoom(0.5)} 
            disabled={imageZoom >= 5}
            style={{ padding: '4px 12px', fontSize: 10, background: imageZoom >= 5 ? '#e5e7eb' : '#3b82f6', color: imageZoom >= 5 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: imageZoom >= 5 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            Zoom In (+)
          </button>
          <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>💡 Scroll to zoom, drag to pan</span>
        </div>

        <div 
          style={{ 
            flex: 1, 
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#1f2937', 
            position: 'relative', 
            cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={(e) => {
            e.preventDefault();
            handleImageZoom(e.deltaY > 0 ? -0.25 : 0.25);
          }}
        >
          <img 
            src={photoPreview} 
            alt="Product Zoomed" 
            style={{ 
              transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
              willChange: 'transform'
            }} 
            draggable={false}
          />
        </div>

        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', padding: 0, margin: 0, display: 'flex', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#000' }}>Item Info</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Product / Item Code <span style={{ color: '#d00' }}>*</span></label>
            <input name="product" value={formData.product} onChange={handleInputChange} style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Description / Name <span style={{ color: '#d00' }}>*</span></label>
            <input name="description" value={formData.description} onChange={handleInputChange} style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Short Description <span style={{ color: '#d00' }}>*</span></label>
            <input name="shortDescription" value={formData.shortDescription} onChange={handleInputChange} style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Long Description 1</label>
            <input name="longDescription1" value={formData.longDescription1} onChange={handleInputChange} style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Long Description 2</label>
            <input name="longDescription2" value={formData.longDescription2} onChange={handleInputChange} style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Base UOM <span style={{ color: '#d00' }}>*</span></label>
            <div style={{ position: 'relative', flex: 1 }}>
              <input readOnly name="baseUOM" value={formData.baseUOM} placeholder="Enter Base UOM for Search" onClick={() => setShowBaseUOMModal(true)} style={{ width: '100%', padding: '3px 45px 3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#333' }} />
              {formData.baseUOM && (
                <button onClick={clearBaseUOM} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <X size={12} color="#ef4444" />
                </button>
              )}
              <button onClick={() => setShowBaseUOMModal(true)} style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><Search size={14} color="#666" /></button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Max. Loose <span style={{ color: '#d00' }}>*</span></label>
            <input type="number" name="maxLoose" value={formData.maxLoose} onChange={handleInputChange} style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>GL Code <span style={{ color: '#d00' }}>*</span></label>
            <div style={{ position: 'relative', flex: 1 }}>
              <input readOnly name="glCode" value={formData.glCode} placeholder="Enter GL Code for Search" onClick={() => setShowGLCodeModal(true)} style={{ width: '100%', padding: '3px 45px 3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#333' }} />
              {formData.glCode && (
                <button onClick={clearGLCode} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <X size={12} color="#ef4444" />
                </button>
              )}
              <button onClick={() => setShowGLCodeModal(true)} style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><Search size={14} color="#666" /></button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Stock/Service</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#000' }}><input type="checkbox" checked={formData.isStockService === 'stock'} onChange={() => setFormData(p => ({ ...p, isStockService: p.isStockService === 'stock' ? null : 'stock', isBatchSerial: p.isStockService === 'stock' ? p.isBatchSerial : null }))} style={{ width: 13, height: 13 }} />Stock</label>
              <label style={{ fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#000' }}><input type="checkbox" checked={formData.isStockService === 'service'} onChange={() => setFormData(p => ({ ...p, isStockService: p.isStockService === 'service' ? null : 'service', isBatchSerial: p.isStockService === 'service' ? p.isBatchSerial : null }))} style={{ width: 13, height: 13 }} />Service</label>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Batch Item/Serial Item</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#000' }}><input type="checkbox" checked={formData.isBatchSerial === 'batch'} onChange={() => setFormData(p => ({ ...p, isBatchSerial: p.isBatchSerial === 'batch' ? null : 'batch' }))} style={{ width: 13, height: 13 }} />Batch</label>
              <label style={{ fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#000' }}><input type="checkbox" checked={formData.isBatchSerial === 'serial'} onChange={() => setFormData(p => ({ ...p, isBatchSerial: p.isBatchSerial === 'serial' ? null : 'serial' }))} style={{ width: 13, height: 13 }} />Serial</label>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Gift Voucher</label>
            <input type="checkbox" checked={formData.isGiftVoucher} onChange={() => handleCheckboxChange('isGiftVoucher')} style={{ width: 13, height: 13 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>Extended Warranty</label>
            <input type="checkbox" checked={formData.isExtendedWarranty} onChange={() => handleCheckboxChange('isExtendedWarranty')} style={{ width: 13, height: 13 }} />
          </div>
        </div>
      </div>

      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ border: '1px solid #999', borderRadius: 4, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
          <h4 style={{ fontSize: 11, fontWeight: 600, margin: '0 0 12px 0', color: '#000' }}>Product Photo</h4>
          {photoPreview ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <img src={photoPreview} alt="Product" style={{ width: '100%', height: 140, objectFit: 'contain', borderRadius: 4, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }} onClick={() => setShowImageModal(true)} />
              <button onClick={removePhoto} style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>×</button>
              <button onClick={() => setShowImageModal(true)} style={{ position: 'absolute', bottom: 4, right: 4, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}><ZoomIn size={14} /></button>
            </div>
          ) : (
            <label style={{ width: '100%', height: 140, border: '2px dashed #ccc', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff' }}>
              <Upload size={28} color="#999" />
              <span style={{ fontSize: 10, color: '#666', marginTop: 8, textAlign: 'center' }}>Click to upload photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      {showBaseUOMModal && renderBaseUOMModal()}
      {showGLCodeModal && renderGLCodeModal()}
      {showImageModal && renderImageModal()}
    </div>
  );
};

export default ItemInfoMaster;
