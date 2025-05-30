import React, { useState, useEffect, useRef } from 'react';
import { fetchAllProducts, createProduct, deleteProduct, updateProduct } from './api/productsApi';

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    count: '',
    imageUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchAllProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.count.toString().includes(searchTerm)
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        [name]: value
      });
    } else {
      setNewProduct({
        ...newProduct,
        [name]: value
      });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store the file for later upload
      setUploadedFile(file);
      
      // Create a URL for preview only
      const imageUrl = URL.createObjectURL(file);
      if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          imageUrl: imageUrl,
          isNewImage: true // Flag to indicate this is a new image
        });
      } else {
        setNewProduct({
          ...newProduct,
          imageUrl: imageUrl,
          isNewImage: true // Flag to indicate this is a new image
        });
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const productToSave = editingProduct || newProduct;
    
    if (!productToSave.name || !productToSave.count || !productToSave.imageUrl) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Handle image URL
      let finalImageUrl = productToSave.imageUrl;
      
      // Only convert to data URL if it's a new uploaded image
      if (uploadedFile && productToSave.isNewImage) {
        finalImageUrl = await convertFileToDataURL(uploadedFile);
      }
      
      // Format the product data
      const productData = {
        name: productToSave.name,
        count: parseInt(productToSave.count),
        imageUrl: finalImageUrl,
        createdAt: productToSave.createdAt || new Date().toISOString()
      };
      
      if (editingProduct) {
        console.log('Updating product:', editingProduct.id, productData);
        await updateProduct(editingProduct.id, productData);
        setEditingProduct(null);
      } else {
        await createProduct(productData);
      }
      
      // Reset form and reload products
      setNewProduct({ name: '', count: '', imageUrl: '' });
      setUploadedFile(null);
      loadProducts();
      setError(null);
      setIsModalOpen(false); // Close modal after successful submission
    } catch (err) {
      console.error('Error during product save:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert File object to data URL
  const convertFileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      count: product.count,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt,
      isNewImage: false // Flag to indicate this is not a new image
    });
    
    setUploadedFile(null);
    setIsModalOpen(true); // Open modal for editing
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setNewProduct({ name: '', count: '', imageUrl: '' });
    setUploadedFile(null);
    setError(null);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        
        // If we're currently editing this product, cancel the edit
        if (editingProduct && editingProduct.id === id) {
          handleCancelEdit();
          setIsModalOpen(false);
        }
        
        loadProducts();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setNewProduct({ 
      name: '', 
      count: '', 
      imageUrl: '',
      isNewImage: false 
    });
    setUploadedFile(null);
    setError(null);
    setIsModalOpen(true);
  };

  // Get the current product being worked with (either new or editing)
  const currentProduct = editingProduct || newProduct;

  // Handle increment/decrement of product count
  const handleCountChange = async (product, increment) => {
    try {
      const newCount = Math.max(0, product.count + increment);
      
      // Only update if the count actually changed
      if (newCount !== product.count) {
        const updatedProduct = {
          ...product,
          count: newCount
        };
        
        await updateProduct(product.id, updatedProduct);
        loadProducts(); // Reload products to get the updated data
      }
    } catch (err) {
      console.error('Error updating product count:', err);
      setError(err.message);
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    // You can replace this with your actual navigation logic
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center">
            <button 
              onClick={handleBackClick}
              className="mr-4 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              Product Manager
            </h1>
          </div>
          <button 
            onClick={openAddProductModal}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Product
          </button>
        </div>
        
        {/* Product List */}
        <div className="backdrop-blur-sm bg-white/5 rounded-3xl p-8 border border-white/10 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-full"></div>
              <h2 className="text-2xl font-semibold text-white">All Products</h2>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-64 lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 border-r-2 border-cyan-500 border-b-2 border-transparent"></div>
              <p className="mt-4 text-slate-400">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-lg">No products found.</p>
              <p className="text-sm text-slate-500">Add your first product using the button above.</p>
              <button 
                onClick={openAddProductModal}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Product
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg">No matching products found.</p>
              <p className="text-sm text-slate-500">Try a different search term or clear the search.</p>
              <button 
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="aspect-square overflow-hidden bg-slate-900/50 relative">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/300?text=Image+Not+Found";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <span className="text-slate-500">No image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                      <div className="p-4 w-full">
                        <div className="flex justify-between gap-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="flex-1 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium transition-colors border border-white/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-white rounded-lg font-medium transition-colors border border-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-medium text-lg mb-2 text-white group-hover:text-cyan-300 transition-colors truncate">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-400">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* Count with increment/decrement controls */}
                      <div className="flex items-center bg-cyan-500/10 rounded-lg border border-cyan-500/20 overflow-hidden">
                        <button 
                          onClick={() => handleCountChange(product, -1)}
                          disabled={product.count <= 0}
                          className={`px-2 py-1 text-white transition-colors ${product.count <= 0 ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-cyan-600/30 hover:bg-cyan-600/50'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <div className="px-3 py-1 text-cyan-300 text-sm font-medium min-w-[40px] text-center">
                          {product.count}
                        </div>
                        <button 
                          onClick={() => handleCountChange(product, 1)}
                          className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Search results count */}
          {products.length > 0 && searchTerm && (
            <div className="mt-6 text-center text-sm text-slate-400">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-3xl border border-white/10 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="sticky top-0 bg-slate-900/90 backdrop-blur-sm p-6 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-full"></div>
            <h2 className="text-2xl font-semibold text-white">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>
          
            <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl text-red-200 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={currentProduct.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Count
                </label>
                <input
                  type="number"
                  name="count"
                  value={currentProduct.count}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
                  </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Image
                </label>
                <div 
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl ${currentProduct.imageUrl ? 'border-cyan-500/30 bg-cyan-900/10' : 'border-white/10 hover:border-white/20'} transition-all cursor-pointer`}
                  onClick={triggerFileInput}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      const fileInput = fileInputRef.current;
                      fileInput.files = e.dataTransfer.files;
                      const event = new Event('change', { bubbles: true });
                      fileInput.dispatchEvent(event);
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    {currentProduct.imageUrl ? (
                      <div className="relative mx-auto w-32 h-32 mb-2 overflow-hidden rounded-lg border border-white/20 group">
                        <img 
                          src={currentProduct.imageUrl} 
                          alt="Preview" 
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/300?text=Invalid+URL";
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                  imageUrl: '',
                                  isNewImage: false
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                  imageUrl: '',
                                  isNewImage: false
                              });
                            }
                            setUploadedFile(null);
                          }}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                          {currentProduct.isNewImage && (
                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/70 text-white text-xs py-1 text-center">
                              New Image
                            </div>
                          )}
                      </div>
                    ) : (
                      <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <div className="flex text-sm text-slate-400 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none"
                      >
                        <span>{currentProduct.imageUrl ? 'Change image' : 'Upload an image'}</span>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    {!currentProduct.imageUrl && (
                      <p className="text-xs text-slate-500 mt-1">
                        Or drag and drop
                      </p>
                    )}
                </div>
              </div>
            </div>
            
                <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                    onClick={() => {
                      handleCancelEdit();
                      setIsModalOpen(false);
                    }}
                  className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors border border-white/5 hover:border-white/10"
                >
                  Cancel
                </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </div>
                ) : (
                  editingProduct ? 'Update Product' : 'Save Product'
                )}
              </button>
            </div>
          </form>
        </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager; 