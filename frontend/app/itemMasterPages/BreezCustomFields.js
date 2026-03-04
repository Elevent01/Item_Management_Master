import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const BreezCustomFields = () => {
  const [formData, setFormData] = useState({
    itemWeight: '',
    slsCategory: '',
    productGrammage: '',
    supplyIn: '',
    repeatLength: '',
    itemCategory: '',
    nameOfCustomer: '',
    laminateStructure: '',
    openWidth: '',
    unwindDirection: ''
  });

  const [showModal, setShowModal] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const lovData = {
    slsCategory: [
      { code: 'SLS01', description: 'Category A' },
      { code: 'SLS02', description: 'Category B' },
      { code: 'SLS03', description: 'Category C' },
      { code: 'SLS04', description: 'Category D' }
    ],
    itemCategory: [
      { code: 'CAT01', description: 'Raw Material' },
      { code: 'CAT02', description: 'Finished Goods' },
      { code: 'CAT03', description: 'Semi-Finished' },
      { code: 'CAT04', description: 'Packaging Material' }
    ]
  };

  const modalTitles = {
    slsCategory: 'SLS CATEGORY',
    itemCategory: 'ITEM CATEGORY'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (fieldName) => {
    setShowModal(fieldName);
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setShowModal(null);
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleSelectValue = (item) => {
    setFormData(prev => ({ ...prev, [showModal]: `${item.code} - ${item.description}` }));
    handleCloseModal();
  };

  const clearField = (fieldName) => {
    setFormData(prev => ({ ...prev, [fieldName]: '' }));
  };

  const getFilteredData = () => {
    if (!showModal) return [];
    const data = lovData[showModal] || [];
    const term = searchValue.toLowerCase();
    if (!term) return data;
    return data.filter(item =>
      item.code.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    );
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderLOVField = (label, fieldName) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>{label}</label>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          readOnly
          value={formData[fieldName]}
          placeholder={`Enter ${label} for Search`}
          onClick={() => handleOpenModal(fieldName)}
          style={{ width: '100%', padding: '3px 45px 3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#333' }}
        />
        {formData[fieldName] && (
          <button onClick={() => clearField(fieldName)} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={12} color="#ef4444" />
          </button>
        )}
        <button onClick={() => handleOpenModal(fieldName)} style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Search size={14} color="#666" />
        </button>
      </div>
    </div>
  );

  const renderInputField = (label, fieldName) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#000', minWidth: 140 }}>{label}</label>
      <input
        name={fieldName}
        value={formData[fieldName]}
        onChange={handleInputChange}
        style={{ flex: 1, padding: '3px 6px', border: '1px solid #999', fontSize: 11, borderRadius: 2, color: '#000' }}
      />
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ width: 500, maxWidth: '90%', height: 300, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
            <span>{modalTitles[showModal]}</span>
            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
              <X size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#000' }}>Search</span>
            <input
              autoFocus
              placeholder={`Enter ${modalTitles[showModal]} for Search`}
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }}
            />
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, i) => (
                    <tr
                      key={item.code}
                      onClick={() => handleSelectValue(item)}
                      style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}
                    >
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                      <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" style={{ padding: '30px', textAlign: 'center', fontSize: 10, color: '#999' }}>No results found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px 12px', fontSize: 10, background: currentPage === 1 ? '#e5e7eb' : '#3b82f6', color: currentPage === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <span style={{ fontSize: 10, color: '#000' }}>Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage === totalPages} style={{ padding: '4px 12px', fontSize: 10, background: currentPage === totalPages ? '#e5e7eb' : '#3b82f6', color: currentPage === totalPages ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>

          {/* Footer */}
          <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', padding: 0, margin: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#000' }}>Custom Fields</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {renderInputField('ITEM WEIGHT', 'itemWeight')}
        {renderLOVField('ITEM CATEGORY', 'itemCategory')}
        {renderLOVField('SLS CATEGORY', 'slsCategory')}
        {renderInputField('Name of the Customer', 'nameOfCustomer')}
        {renderInputField('Product & Grammage', 'productGrammage')}
        {renderInputField('Laminate Structure', 'laminateStructure')}
        {renderInputField('Supply in', 'supplyIn')}
        {renderInputField('Open Width', 'openWidth')}
        {renderInputField('Repeat Length', 'repeatLength')}
        {renderInputField('Unwind Direction of the roll', 'unwindDirection')}
      </div>

      {renderModal()}
    </div>
  );
};

export default BreezCustomFields;
