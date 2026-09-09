'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { activateMembership, inviteUserToCamp, revokeMembership, setMembershipExpiry } from './actions'

export interface CampReadiness {
  campId: string
  nome: string
  ano: number | null
  arquivado: boolean
  totalMemberships: number
  activeEditors: number
  lastActivity: string | null
  activity24h: number
  activity7d: number
  readyForRls: boolean
}

export interface MembershipRow {
  id: string
  campId: string
  userId: string
  role: 'adjunto' | 'field_viewer'
  status: 'invited' | 'active' | 'revoked'
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  email: string | null
  displayName: string | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

export function MembershipsClient({
  readiness,
  memberships,
  campos,
}: {
  readiness: CampReadiness[]
  memberships: MembershipRow[]
  campos: { id: string; nome: string }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCamp, setInviteCamp] = useState('')
  const [inviteRole, setInviteRole] = useState<'adjunto' | 'field_viewer'>('adjunto')

  const readyCount = readiness.filter((r) => r.readyForRls).length

  function handleInvite() {
    if (!inviteEmail || !inviteCamp) {
      toast.error('Preenche o email e escolhe um campo.')
      return
    }
    const fd = new FormData()
    fd.set('email', inviteEmail)
    fd.set('camp_id', inviteCamp)
    fd.set('role', inviteRole)
    startTransition(async () => {
      const res = await inviteUserToCamp(fd)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.createdNewAccount ? 'Conta criada e associada ao campo.' : 'Membership criada.')
        setInviteEmail('')
      }
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const res = await revokeMembership(id)
      if (res.error) toast.error(res.error)
      else toast.success('Acesso revogado.')
    })
  }

  function handleActivate(id: string) {
    startTransition(async () => {
      const res = await activateMembership(id)
      if (res.error) toast.error(res.error)
      else toast.success('Membership ativada.')
    })
  }

  function handleExpiry(id: string, value: string) {
    startTransition(async () => {
      const res = await setMembershipExpiry(id, value ? new Date(value).toISOString() : null)
      if (res.error) toast.error(res.error)
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-16">
      <div>
        <h1 className="text-lg font-bold text-[#36454F]">Onboarding de utilizadores (V2)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ferramenta temporária de migração — cria contas reais e memberships antes de fechar o acesso legacy (PIN).
          {' '}{readyCount}/{readiness.length} campos prontos para RLS.
        </p>
      </div>

      {/* Migration Readiness */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-[#36454F] uppercase tracking-wide">Estado de migração por campo</h2>
        <div className="overflow-x-auto rounded-xl border border-[#E7E8D1]">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F8F4] text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Campo</th>
                <th className="text-left px-3 py-2">Última atividade</th>
                <th className="text-left px-3 py-2">24h / 7d</th>
                <th className="text-left px-3 py-2">Editores ativos</th>
                <th className="text-left px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {readiness.map((r) => (
                <tr key={r.campId} className="border-t border-[#E7E8D1]">
                  <td className="px-3 py-2 font-medium text-[#36454F]">
                    {r.nome} {r.arquivado && <span className="text-xs text-gray-400">(arquivado)</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(r.lastActivity)}</td>
                  <td className="px-3 py-2 text-gray-600">{r.activity24h} / {r.activity7d}</td>
                  <td className="px-3 py-2 text-gray-600">{r.activeEditors} ({r.totalMemberships} total)</td>
                  <td className="px-3 py-2">
                    {r.readyForRls ? (
                      <Badge className="bg-[#E3F1E7] text-[#2F7D4F] border-0">READY</Badge>
                    ) : (
                      <Badge className="bg-[#FBEAE7] text-[#A9382C] border-0">NOT READY</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite form */}
      <section className="space-y-3 bg-white rounded-xl border border-[#E7E8D1] p-4">
        <h2 className="text-sm font-semibold text-[#36454F] uppercase tracking-wide">Convidar / associar utilizador</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="pessoa@email.com" />
          </div>
          <div>
            <Label className="text-xs">Campo</Label>
            <Select value={inviteCamp} onValueChange={setInviteCamp}>
              <SelectTrigger><SelectValue placeholder="Escolhe um campo" /></SelectTrigger>
              <SelectContent>
                {campos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'adjunto' | 'field_viewer')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjunto">Adjunto (leitura + escrita)</SelectItem>
                <SelectItem value="field_viewer">Field viewer (só leitura)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleInvite} disabled={isPending}>
          {isPending ? 'A processar…' : 'Convidar / associar'}
        </Button>
        <p className="text-xs text-gray-400">
          Se o email já tiver conta, fica <b>active</b> de imediato. Se for nova, fica <b>invited</b> até ao primeiro
          login — a pessoa entra em /login com o mesmo email, por Email OTP, sem precisar de password.
        </p>
      </section>

      {/* Existing memberships */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-[#36454F] uppercase tracking-wide">Memberships existentes</h2>
        <div className="overflow-x-auto rounded-xl border border-[#E7E8D1]">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F8F4] text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Pessoa</th>
                <th className="text-left px-3 py-2">Campo</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="text-left px-3 py-2">Expira</th>
                <th className="text-left px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {memberships.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Nenhuma membership ainda.</td></tr>
              )}
              {memberships.map((m) => {
                const campo = campos.find((c) => c.id === m.campId)
                return (
                  <tr key={m.id} className="border-t border-[#E7E8D1]">
                    <td className="px-3 py-2">{m.email ?? m.displayName ?? m.userId.slice(0, 8)}</td>
                    <td className="px-3 py-2">{campo?.nome ?? m.campId.slice(0, 8)}</td>
                    <td className="px-3 py-2">{m.role}</td>
                    <td className="px-3 py-2">
                      <Badge
                        className={
                          m.status === 'active'
                            ? 'bg-[#E3F1E7] text-[#2F7D4F] border-0'
                            : m.status === 'invited'
                              ? 'bg-[#FBF3DA] text-[#8E7015] border-0'
                              : 'bg-gray-100 text-gray-500 border-0'
                        }
                      >
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        defaultValue={m.expiresAt ? m.expiresAt.slice(0, 10) : ''}
                        onBlur={(e) => handleExpiry(m.id, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      {m.status !== 'active' && m.status !== 'revoked' && (
                        <Button size="sm" variant="outline" onClick={() => handleActivate(m.id)} disabled={isPending}>
                          Ativar
                        </Button>
                      )}
                      {m.status !== 'revoked' && (
                        <Button size="sm" variant="outline" onClick={() => handleRevoke(m.id)} disabled={isPending}>
                          Revogar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
