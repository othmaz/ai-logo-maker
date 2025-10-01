import React, { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import JSZip from 'jszip'

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  logo: {
    id: string
    url: string
    logo_url?: string
    prompt?: string
  }
  isPremiumUser: boolean
  businessName?: string
  onSave?: (logo: { id: string; url: string; prompt: string }) => void
}

interface FormatOption {
  id: string
  name: string
  description: string
  enabled: boolean
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, logo, isPremiumUser, businessName = 'logo', onSave }) => {
  const { user } = useUser()
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['png-hd', 'png'])
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, 'pending' | 'processing' | 'completed' | 'error'>>({})
  const [showUnzipInstructions, setShowUnzipInstructions] = useState(false)

  // Sanitize business name for file system
  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  }

  const safeBusinessName = sanitizeFilename(businessName)

  const formatOptions: FormatOption[] = [
    {
      id: 'png-hd',
      name: 'PNG (Standard, 1024x1024)',
      description: 'Standard resolution for digital use',
      enabled: isPremiumUser
    },
    {
      id: 'png',
      name: 'PNG (8K, High-Resolution)',
      description: 'Premium upscaled version for print and professional use',
      enabled: isPremiumUser
    },
    {
      id: 'png-no-bg',
      name: 'PNG (Background Removed)',
      description: 'Transparent background for versatile use',
      enabled: isPremiumUser
    },
    {
      id: 'svg',
      name: 'SVG (Vector, Scalable)',
      description: 'Infinite scalability for any size application',
      enabled: isPremiumUser
    },
    {
      id: 'favicon',
      name: 'Favicon (.ico for website tab)',
      description: '32x32 optimized for browser tabs',
      enabled: isPremiumUser
    },
    {
      id: 'profile',
      name: 'Profile Picture (Rounded PNG)',
      description: '512x512 circular format for social media',
      enabled: isPremiumUser
    }
  ]

  const toggleFormat = (formatId: string) => {
    const format = formatOptions.find(f => f.id === formatId)
    if (!format?.enabled) return

    setSelectedFormats(prev =>
      prev.includes(formatId)
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    )
  }

  const downloadFile = (data: string, filename: string, mimeType: string) => {
    const byteCharacters = atob(data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const downloadSVG = (svgData: string, filename: string) => {
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleDownload = async () => {
    if (!user || selectedFormats.length === 0) return

    setIsDownloading(true)
    const newProgress: Record<string, 'pending' | 'processing' | 'completed' | 'error'> = {}
    selectedFormats.forEach(format => {
      newProgress[format] = 'pending'
    })
    setDownloadProgress(newProgress)

    try {
      const zip = new JSZip()
      const folder = zip.folder(safeBusinessName)

      if (!folder) {
        throw new Error('Failed to create ZIP folder')
      }

      // Store the highest quality image URL - start with original, upgrade to 8K if available
      let bestQualityUrl = logo.logo_url || logo.url

      // PHASE 1: Process 8K upscale FIRST if selected (since SVG and BG removal should use it)
      if (selectedFormats.includes('png')) {
        const formatId = 'png'
        setDownloadProgress(prev => ({ ...prev, [formatId]: 'processing' }))

        try {
          const response = await fetch(`/api/logos/${logo.id}/upscale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkUserId: user.id,
              logoUrl: logo.logo_url || logo.url
            })
          })

          const result = await response.json()
          if (result.success) {
            bestQualityUrl = result.upscaledUrl // Update to use 8K for subsequent operations
            const imageResponse = await fetch(result.upscaledUrl)
            const blob = await imageResponse.blob()
            folder.file(`${safeBusinessName}-8k.png`, blob)
            setDownloadProgress(prev => ({ ...prev, [formatId]: 'completed' }))
          } else {
            console.error('❌ 8K upscale failed:', result.error)
            setDownloadProgress(prev => ({ ...prev, [formatId]: 'error' }))
            throw new Error(result.error || '8K upscale failed')
          }
        } catch (error) {
          console.error(`Error downloading ${formatId}:`, error)
          setDownloadProgress(prev => ({ ...prev, [formatId]: 'error' }))
        }
      }

      // PHASE 2: Process remaining formats (using bestQualityUrl which is 8K if available)
      for (const formatId of selectedFormats) {
        // Skip 8K since we already processed it
        if (formatId === 'png') continue

        setDownloadProgress(prev => ({ ...prev, [formatId]: 'processing' }))

        try {
          if (formatId === 'png-hd') {
            const imageResponse = await fetch(logo.logo_url || logo.url)
            const blob = await imageResponse.blob()
            folder.file(`${safeBusinessName}-fullhd.png`, blob)
          } else if (formatId === 'png-no-bg') {
            const response = await fetch(`/api/logos/${logo.id}/remove-background`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clerkUserId: user.id,
                logoUrl: bestQualityUrl // Use 8K version if available
              })
            })

            const result = await response.json()
            if (result.success) {
              const imageResponse = await fetch(result.processedUrl)
              const blob = await imageResponse.blob()
              folder.file(`${safeBusinessName}-no-background.png`, blob)
            } else {
              console.error('❌ Background removal failed:', result.error)
              throw new Error(result.error || 'Background removal failed')
            }
          } else if (formatId === 'svg') {
            const response = await fetch(`/api/logos/${logo.id}/vectorize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clerkUserId: user.id,
                logoUrl: bestQualityUrl // Use 8K version if available
              })
            })

            const result = await response.json()
            if (result.success) {
              folder.file(`${safeBusinessName}-vector.svg`, result.svgData)
            } else {
              console.error('❌ SVG vectorization failed:', result.error)
              throw new Error(result.error || 'SVG vectorization failed')
            }
          } else if (formatId === 'favicon') {
            const response = await fetch(`/api/logos/${logo.id}/formats`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clerkUserId: user.id,
                formats: [formatId],
                logoUrl: bestQualityUrl // Use 8K version if available
              })
            })

            const result = await response.json()
            if (result.success && result.formats[formatId]) {
              const format = result.formats[formatId]
              const byteCharacters = atob(format.data)
              const byteNumbers = new Array(byteCharacters.length)
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
              }
              const byteArray = new Uint8Array(byteNumbers)
              folder.file(`${safeBusinessName}-favicon.ico`, byteArray)
            } else {
              console.error('❌ Favicon generation failed:', result.error)
              throw new Error(result.error || 'Favicon generation failed')
            }
          } else if (formatId === 'profile') {
            const response = await fetch(`/api/logos/${logo.id}/formats`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clerkUserId: user.id,
                formats: [formatId],
                logoUrl: bestQualityUrl // Use 8K version if available
              })
            })

            const result = await response.json()
            if (result.success && result.formats[formatId]) {
              const format = result.formats[formatId]
              const byteCharacters = atob(format.data)
              const byteNumbers = new Array(byteCharacters.length)
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
              }
              const byteArray = new Uint8Array(byteNumbers)
              folder.file(`${safeBusinessName}-profile.png`, byteArray)
            } else {
              console.error('❌ Profile picture generation failed:', result.error)
              throw new Error(result.error || 'Profile picture generation failed')
            }
          }

          setDownloadProgress(prev => ({ ...prev, [formatId]: 'completed' }))
        } catch (error) {
          console.error(`Error downloading ${formatId}:`, error)
          setDownloadProgress(prev => ({ ...prev, [formatId]: 'error' }))
        }
      }

      // Generate and download ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeBusinessName}-logos.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Auto-save logo to collection after successful download
      if (onSave && logo.prompt) {
        onSave({
          id: logo.id,
          url: logo.logo_url || logo.url,
          prompt: logo.prompt
        })
      }

      // Show unzip instructions
      setShowUnzipInstructions(true)

    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(34,211,238,0.3)] max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">DOWNLOAD CENTER</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mt-2"></div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-cyan-400 text-3xl transition-all hover:rotate-90 duration-300"
            >
              ×
            </button>
          </div>

          {/* Logo Preview */}
          <div className="mb-6">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <img
                src={logo.logo_url || logo.url}
                alt="Logo Preview"
                className="max-w-full max-h-32 mx-auto rounded"
              />
            </div>
          </div>

          {/* Premium Status */}
          {!isPremiumUser && (
            <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <p className="text-orange-400 font-mono text-sm">
                🚀 Premium subscription required for advanced download formats
              </p>
            </div>
          )}

          {/* Format Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white font-mono mb-4">SELECT FORMATS:</h3>
            <div className="space-y-3">
              {formatOptions.map(format => (
                <div
                  key={format.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    format.enabled
                      ? selectedFormats.includes(format.id)
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-gray-600 hover:border-gray-500'
                      : 'border-yellow-500/70 bg-gray-700/30 cursor-not-allowed opacity-50 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                  }`}
                  onClick={() => toggleFormat(format.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-5 h-5 border-2 rounded mt-0.5 flex items-center justify-center ${
                      format.enabled && selectedFormats.includes(format.id)
                        ? 'border-cyan-400 bg-cyan-400'
                        : 'border-gray-500'
                    }`}>
                      {format.enabled && selectedFormats.includes(format.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${format.enabled ? 'text-white' : 'text-gray-500'}`}>
                        {format.name}
                      </p>
                      <p className={`text-sm ${format.enabled ? 'text-gray-300' : 'text-gray-600'}`}>
                        {format.description}
                      </p>
                      {downloadProgress[format.id] && (
                        <div className="mt-3">
                          {downloadProgress[format.id] === 'processing' && (
                            <div className="space-y-2 animate-fadeIn">
                              <div className="flex items-center space-x-3">
                                <div className="relative w-5 h-5">
                                  <div className="absolute inset-0 border-3 border-yellow-400/20 rounded-full"></div>
                                  <div className="absolute inset-0 border-3 border-transparent border-t-yellow-400 border-r-yellow-400 rounded-full animate-spin"></div>
                                </div>
                                <span className="text-yellow-400 text-sm font-bold tracking-wide">
                                  {format.id === 'png' ? 'AI UPSCALING TO 8K...' : 'PROCESSING...'}
                                </span>
                              </div>
                              <div className="relative w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{backgroundSize: '200% 100%'}}></div>
                              </div>
                              {format.id === 'png' && (
                                <div className="flex items-center space-x-1.5">
                                  <svg className="w-3 h-3 text-yellow-400/70" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-yellow-400/70 text-xs">5-10 seconds</span>
                                </div>
                              )}
                            </div>
                          )}
                          {downloadProgress[format.id] === 'completed' && (
                            <div className="flex items-center space-x-3 animate-fadeIn">
                              <div className="relative w-5 h-5">
                                <div className="absolute inset-0 bg-green-500 rounded-full animate-[pulse_0.5s_ease-out]"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                              <span className="text-green-400 text-sm font-bold tracking-wide">COMPLETE</span>
                            </div>
                          )}
                          {downloadProgress[format.id] === 'error' && (
                            <div className="flex items-center space-x-3 animate-shake">
                              <div className="relative w-5 h-5">
                                <div className="absolute inset-0 bg-red-500 rounded-full"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">!</span>
                                </div>
                              </div>
                              <span className="text-red-400 text-sm font-bold tracking-wide">FAILED</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Download Button */}
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent border-t border-cyan-400/30">
          <button
            onClick={handleDownload}
            disabled={selectedFormats.length === 0 || isDownloading}
            className={`relative w-full py-4 px-8 rounded-2xl font-bold font-mono text-lg transition-all duration-300 overflow-hidden group ${
              selectedFormats.length === 0 || isDownloading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] active:scale-95'
            }`}
          >
            {/* Animated background shine */}
            {!isDownloading && selectedFormats.length > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}

            <div className="relative flex items-center justify-center space-x-3">
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="animate-pulse">CREATING YOUR FILES...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>DOWNLOAD {selectedFormats.length} FORMAT{selectedFormats.length !== 1 ? 'S' : ''}</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Unzip Instructions Modal */}
      {showUnzipInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[110] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-cyan-400 max-w-lg w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-3xl font-bold text-white font-mono mb-2">DOWNLOAD COMPLETE!</h2>
              <p className="text-cyan-400 font-mono">Your files are ready in: {safeBusinessName}-logos.zip</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-white font-mono mb-4">📂 HOW TO ACCESS YOUR FILES:</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <p>Find the downloaded <span className="text-white font-mono">{safeBusinessName}-logos.zip</span> file (usually in your Downloads folder)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <p><span className="text-white font-bold">Double-click</span> the ZIP file to extract it</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <p>Open the <span className="text-white font-mono">{safeBusinessName}</span> folder</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <p>All your logo files are inside with the business name prefix!</p>
                </div>
              </div>
            </div>

            <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-lg p-4 mb-6">
              <p className="text-cyan-300 text-sm">
                💡 <span className="font-bold">Tip:</span> Each file is named <span className="font-mono">{safeBusinessName}-[format].png</span> for easy organization!
              </p>
            </div>

            <button
              onClick={() => {
                setShowUnzipInstructions(false)
                onClose()
              }}
              className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold font-mono hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              GOT IT! ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadModal