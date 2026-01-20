import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDocumentUrl } from '../lib/supabase';
import { Award, Check, X, FileText, Clock, CheckCircle, XCircle, Eye, User as UserIcon } from 'lucide-react';
import { createNotification } from '../App';

const AdminCertificationPanel = ({ adminUser }) => {
  const db = getFirestore();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [filter]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let providersQuery;
      
      if (filter === 'all') {
        providersQuery = query(
          collection(db, 'serviceProviders'),
          where('certificationStatus', '==', 'certified')
        );
      } else if (filter === 'pending') {
        providersQuery = query(
          collection(db, 'serviceProviders'),
          where('certificationStatus', '==', 'certified'),
          where('certificationApproved', '==', false)
        );
      } else if (filter === 'approved') {
        providersQuery = query(
          collection(db, 'serviceProviders'),
          where('certificationStatus', '==', 'certified'),
          where('certificationApproved', '==', true)
        );
      } else if (filter === 'rejected') {
        providersQuery = query(
          collection(db, 'serviceProviders'),
          where('certificationStatus', '==', 'certified'),
          where('certificationRejected', '==', true)
        );
      }

      const snapshot = await getDocs(providersQuery);
      const providersData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // Get document URLs
          const documentUrls = {};
          if (data.verificationDocuments && Array.isArray(data.verificationDocuments)) {
            for (const docPath of data.verificationDocuments) {
              const url = await getDocumentUrl(docPath);
              documentUrls[docPath] = url;
            }
          }

          return {
            id: docSnapshot.id,
            ...data,
            documentUrls
          };
        })
      );

      setProviders(providersData);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (providerId, providerData) => {
    if (!confirm('Approve this provider as certified?')) return;
    
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        certificationApproved: true,
        certificationRejected: false,
        certificationApprovedBy: adminUser.uid,
        certificationApprovedAt: serverTimestamp(),
        certificationApprovedByName: adminUser.displayName || adminUser.email
      });

      // Send notification to provider
      await createNotification(
        providerId,
        'certification',
        `Congratulations! Your certification has been approved. You are now a Certified Provider!`,
        '/admin?tab=profile'
      );

      alert('Provider approved successfully!');
      fetchProviders();
      setShowDetails(false);
    } catch (error) {
      console.error('Error approving provider:', error);
      alert('Failed to approve provider');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (providerId) => {
    const reason = prompt('Enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        certificationApproved: false,
        certificationRejected: true,
        certificationRejectedBy: adminUser.uid,
        certificationRejectedAt: serverTimestamp(),
        certificationRejectedByName: adminUser.displayName || adminUser.email,
        certificationRejectionReason: reason || 'No reason provided'
      });

      // Send notification to provider
      await createNotification(
        providerId,
        'certification',
        `Your certification request has been reviewed. ${reason ? `Reason: ${reason}` : 'Please check your profile for more details.'}`,
        '/admin?tab=profile'
      );

      alert('Provider certification rejected');
      fetchProviders();
      setShowDetails(false);
    } catch (error) {
      console.error('Error rejecting provider:', error);
      alert('Failed to reject provider');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (provider) => {
    if (provider.certificationApproved) {
      return <span className="px-2 py-1 bg-green-500/20 border border-green-500/40 text-green-300 rounded text-xs font-medium">✓ Approved</span>;
    } else if (provider.certificationRejected) {
      return <span className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-300 rounded text-xs font-medium">✗ Rejected</span>;
    } else {
      return <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded text-xs font-medium animate-pulse">⏳ Pending Review</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <Award className="h-8 w-8 text-yellow-400" />
            Certification Management
          </h1>
          <p className="text-gray-400 text-sm">Review and approve certification requests from service providers</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Pending Review ({providers.filter(p => !p.certificationApproved && !p.certificationRejected).length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Approved ({providers.filter(p => p.certificationApproved).length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Rejected ({providers.filter(p => p.certificationRejected).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All ({providers.length})
          </button>
        </div>

        {/* Providers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <Award className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No providers found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedProvider(provider);
                  setShowDetails(true);
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {provider.profilePicture ? (
                      <img
                        src={provider.profilePicture}
                        alt={provider.fullName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold">{provider.fullName || 'Unknown'}</h3>
                      <p className="text-gray-400 text-sm">{provider.serviceType}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    {getStatusBadge(provider)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Documents:</span>
                    <span className="text-white">
                      {provider.verificationDocuments?.length || 0} uploaded
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Experience:</span>
                    <span className="text-white">{provider.experienceYears || provider.experience || 'N/A'} years</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProvider(provider);
                    setShowDetails(true);
                  }}
                  className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Review Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Provider Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Full Name:</span>
                    <p className="text-white font-medium">{selectedProvider.fullName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Service Type:</span>
                    <p className="text-white font-medium">{selectedProvider.serviceType}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <p className="text-white font-medium">{selectedProvider.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <p className="text-white font-medium">{selectedProvider.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <p className="text-white font-medium">{selectedProvider.location}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Experience:</span>
                    <p className="text-white font-medium">{selectedProvider.experienceYears || selectedProvider.experience} years</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Uploaded Documents
                </h3>
                {selectedProvider.verificationDocuments && selectedProvider.verificationDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProvider.verificationDocuments.map((docPath, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                        <span className="text-white text-sm">{docPath.split('/').pop()}</span>
                        <a
                          href={selectedProvider.documentUrls[docPath]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No documents uploaded</p>
                )}
              </div>

              {/* Current Status */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certification Status
                </h3>
                <div className="bg-gray-900/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Status:</span>
                    {getStatusBadge(selectedProvider)}
                  </div>
                  {selectedProvider.certificationApproved && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Approved By:</span>
                        <span className="text-green-300">{selectedProvider.certificationApprovedByName || 'Admin'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Approved At:</span>
                        <span className="text-green-300">
                          {selectedProvider.certificationApprovedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedProvider.certificationRejected && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Rejected By:</span>
                        <span className="text-red-300">{selectedProvider.certificationRejectedByName || 'Admin'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Reason:</span>
                        <span className="text-red-300">{selectedProvider.certificationRejectionReason || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!selectedProvider.certificationApproved && (
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleApprove(selectedProvider.id, selectedProvider)}
                    disabled={processing}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Approve Certification
                  </button>
                  <button
                    onClick={() => handleReject(selectedProvider.id)}
                    disabled={processing}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject Certification
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificationPanel;
