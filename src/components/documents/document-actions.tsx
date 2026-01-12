'use client'

import { useState } from 'react'
import { Share2, Mail, Printer, CheckCircle2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { generatePublicShareLink, disablePublicSharing } from '@/app/actions/public-invoices'
import { sendInvoiceEmail } from '@/app/actions/email'
import { useRouter } from 'next/navigation'

interface DocumentActionsProps {
  document: any
}

export function DocumentActions({ document }: DocumentActionsProps) {
  const router = useRouter()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(
    document.publicShareToken && document.publicShareEnabled
      ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/invoice/${document.publicShareToken}`
      : null
  )
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailTo, setEmailTo] = useState(document.customer?.email || '')
  const [emailSubject, setEmailSubject] = useState(
    `Invoice ${document.documentNumber} from ${document.organization?.name || 'us'}`
  )
  const [emailMessage, setEmailMessage] = useState(
    `Please find attached invoice ${document.documentNumber}.\n\nYou can view and pay this invoice online at the link below.`
  )

  async function handleGenerateShareLink() {
    setLoading(true)
    try {
      const result = await generatePublicShareLink(document.id)
      if (result.success && result.shareUrl) {
        setShareLink(result.shareUrl)
        // Copy to clipboard automatically
        await navigator.clipboard.writeText(result.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Error generating share link:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyLink() {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleDisableSharing() {
    setLoading(true)
    try {
      await disablePublicSharing(document.id)
      setShareLink(null)
      router.refresh()
    } catch (error) {
      console.error('Error disabling sharing:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendEmail() {
    if (!emailTo) {
      setEmailError('Email address is required')
      return
    }

    setEmailSending(true)
    setEmailError(null)

    try {
      const result = await sendInvoiceEmail({
        documentId: document.id,
        to: emailTo,
        subject: emailSubject,
        message: emailMessage,
      })

      if (result.success) {
        setEmailSuccess(true)
        setTimeout(() => {
          setEmailSuccess(false)
          setEmailDialogOpen(false)
        }, 2000)
      } else {
        setEmailError(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      setEmailError(error.message || 'Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  // Only show share button for invoices
  const canShare = document.documentType === 'INVOICE'

  return (
    <div className="flex gap-2">
      {canShare && (
        <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
        <Mail className="mr-2 h-4 w-4" />
        Email
      </Button>

      <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
            <DialogDescription>
              Generate a public link that anyone can use to view and pay this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {shareLink ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Public Link</Label>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={handleCopyLink}>
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This link will remain active until you disable sharing.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDisableSharing}
                    disabled={loading}
                    className="w-full"
                  >
                    Disable Sharing
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a public link that customers can use to view and pay this invoice without
                  logging in.
                </p>
                <Button onClick={handleGenerateShareLink} disabled={loading} className="w-full">
                  {loading ? 'Generating...' : 'Generate Share Link'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Send this invoice to the customer via email with a link to view and pay online.
            </DialogDescription>
          </DialogHeader>

          {emailSuccess ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-in zoom-in duration-500">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="mt-4 text-lg font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700">
                Email Sent!
              </p>
              <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                The invoice has been sent successfully
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {emailError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {emailError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="emailTo">To <span className="text-destructive">*</span></Label>
                <Input
                  id="emailTo"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="customer@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailSubject">Subject</Label>
                <Input
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailMessage">Message</Label>
                <Textarea
                  id="emailMessage"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  A link to view and pay the invoice online will be included automatically.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEmailDialogOpen(false)}
                  disabled={emailSending}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button onClick={handleSendEmail} disabled={emailSending || !emailTo} className="w-full">
                  {emailSending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
