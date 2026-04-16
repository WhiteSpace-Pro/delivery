'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { updateAddressLocation } from '@/app/(admin)/actions/address-actions'
import { TomTomMap } from '@/components/client/TomTomMap'

interface InvalidAddressHandlerProps {
  addressId: string
  isAdmin: boolean
  onFixed: () => void
  onContinueAnyway?: (e?: any) => void
  currentAddress?: any
}

export function InvalidAddressHandler({ addressId, isAdmin, onFixed, onContinueAnyway, currentAddress }: InvalidAddressHandlerProps) {
  const [mode, setMode] = useState<'options' | 'cep' | 'manual' | 'results' | 'confirm'>('options')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedPoint, setSelectedPoint] = useState<any>(null)
  const [saveToAccount, setSaveToAccount] = useState(currentAddress?.user_id != null)

  const [form, setForm] = useState({
    zipcode: currentAddress?.zipcode || '',
    street: currentAddress?.street || '',
    number: currentAddress?.number || '',
    neighborhood: currentAddress?.neighborhood || '',
    city: currentAddress?.city || 'Belo Horizonte',
    state: currentAddress?.state || 'MG'
  })

  const handleCEP = async () => {
    setErrorMsg('')
    if (form.zipcode.replace(/\D/g, '').length !== 8) {
      setErrorMsg('CEP inválido')
      return
    }
    if (!form.number) {
      setErrorMsg('Digite o número')
      return
    }
    setLoading(true)
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${form.zipcode.replace(/\D/g, '')}/json/`)
      const viaCepData = await viaCepRes.json()
      if (viaCepData.erro) {
        setErrorMsg('CEP não encontrado')
        setLoading(false)
        return
      }

      setForm(prev => ({
        ...prev,
        street: viaCepData.logradouro,
        neighborhood: viaCepData.bairro,
        city: viaCepData.localidade,
        state: viaCepData.uf
      }))

      const query = new URLSearchParams({
        street: viaCepData.logradouro,
        number: form.number,
        neighborhood: viaCepData.bairro,
        city: viaCepData.localidade,
        state: viaCepData.uf,
        multi: 'true'
      })
      const geoRes = await fetch(`/api/geocode?${query.toString()}`)
      const geoData = await geoRes.json()

      if (Array.isArray(geoData) && geoData.length > 0) {
        if (geoData.length === 1) {
          setSelectedPoint(geoData[0])
          setMode('confirm')
        } else {
          setResults(geoData)
          setMode('results')
        }
      } else {
        setErrorMsg('Não conseguimos localizar no mapa. Tente o endereço livre.')
      }
    } catch (e) {
      console.error(e)
      setErrorMsg('Erro ao tentar atualizar o endereço')
    } finally {
      setLoading(false)
    }
  }

  const handleManual = async () => {
    setErrorMsg('')
    if (!form.street || !form.number || !form.neighborhood) {
      setErrorMsg('Preencha rua, número e bairro')
      return
    }
    setLoading(true)
    try {
      const query = new URLSearchParams({
        street: form.street,
        number: form.number,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        multi: 'true'
      })
      const geoRes = await fetch(`/api/geocode?${query.toString()}`)
      const geoData = await geoRes.json()

      if (Array.isArray(geoData) && geoData.length > 0) {
        if (geoData.length === 1) {
          setSelectedPoint(geoData[0])
          setMode('confirm')
        } else {
          setResults(geoData)
          setMode('results')
        }
      } else {
        setErrorMsg('Localização não encontrada. Verifique o nome da rua e bairro.')
      }
    } catch (e) {
      console.error(e)
      setErrorMsg('Erro ao buscar o endereço')
    } finally {
      setLoading(false)
    }
  }


  const handleConfirmSelection = async (point: any) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const updatePayload: any = {
        street: form.street,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        number: form.number,
        zipcode: form.zipcode,
        lat: point.lat,
        lng: point.lng
      };

      if (!isAdmin) {
        updatePayload.user_id = saveToAccount ? currentAddress?.user_id : null;
      }

      await updateAddressLocation(addressId, updatePayload)
      onFixed()
    } catch (e) {
      console.error(e)
      setErrorMsg('Erro ao tentar atualizar o endereço')
    } finally {
      setLoading(false)
    }
  }

  const mainMessage = isAdmin
    ? "Endereço sem localização válida — corrija para despachar"
    : "Este endereço não possui localização confirmada. A entrega pode ser prejudicada."

  return (
    <div className="w-full space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 text-left">
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="font-medium text-sm ml-2">
          {mainMessage}
        </AlertDescription>
      </Alert>

      {mode === 'options' && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setMode('cep')}
            className="w-full py-2.5 text-sm font-bold bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Tenho o CEP
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className="w-full py-2.5 text-sm font-bold bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Não sei o CEP
          </button>
          {!isAdmin && onContinueAnyway && (
            <button
              type="button"
              onClick={onContinueAnyway}
              className="w-full py-2.5 text-sm font-bold bg-[#E85D24] text-white rounded-xl hover:bg-[#D14D1B] transition-colors"
            >
              Continuar mesmo assim
            </button>
          )}
        </div>
      )}

      {mode === 'cep' && (
        <div className="space-y-3 p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
          <div className="flex gap-2">
            <input
              placeholder="CEP"
              value={form.zipcode}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                const masked = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val;
                setForm(prev => ({ ...prev, zipcode: masked }))
              }}
              className="w-2/3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm focus:border-[#E85D24] outline-none text-white"
            />
            <input
              placeholder="Número"
              value={form.number}
              onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
              className="w-1/3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm focus:border-[#E85D24] outline-none text-white"
            />
          </div>
          {errorMsg && <p className="text-xs font-bold text-red-500">{errorMsg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('options'); setErrorMsg(''); }}
              className="flex-1 py-2 text-xs font-bold bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleCEP}
              className="flex-1 py-2 text-xs font-bold bg-[#E85D24] text-white rounded-lg hover:bg-[#D14D1B] disabled:opacity-50 flex justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar e Salvar'}
            </button>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-3 p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
          <input
            placeholder="Rua / Avenida"
            value={form.street}
            onChange={e => setForm(prev => ({ ...prev, street: e.target.value }))}
            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm focus:border-[#E85D24] outline-none text-white"
          />
          <div className="flex gap-2">
            <input
              placeholder="Número"
              value={form.number}
              onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
              className="w-1/3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm focus:border-[#E85D24] outline-none text-white"
            />
            <input
              placeholder="Bairro"
              value={form.neighborhood}
              onChange={e => setForm(prev => ({ ...prev, neighborhood: e.target.value }))}
              className="w-2/3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm focus:border-[#E85D24] outline-none text-white"
            />
          </div>
          {errorMsg && <p className="text-xs font-bold text-red-500">{errorMsg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('options'); setErrorMsg(''); }}
              className="flex-1 py-2 text-xs font-bold bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleManual}
              className="flex-1 py-2 text-xs font-bold bg-[#E85D24] text-white rounded-lg hover:bg-[#D14D1B] disabled:opacity-50 flex justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar e Salvar'}
            </button>
          </div>
        </div>
      )}


      {mode === 'results' && (
        <div className="space-y-3 p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
          <p className="text-sm font-bold text-white/90">Foram encontrados múltiplos resultados. Selecione o correto:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setSelectedPoint(r); setMode('confirm'); }}
                className="w-full text-left p-3 rounded-xl border border-white/10 hover:border-apollo-orange hover:bg-white/5 transition-all text-xs"
              >
                {r.displayName}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setMode('manual'); setResults([]); }}
              className="flex-1 py-2 text-xs font-bold bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {mode === 'confirm' && selectedPoint && (
        <div className="space-y-3 p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
          <p className="text-sm font-bold text-white/90 mb-2">Confirme a localização no mapa:</p>
          <div className="rounded-xl overflow-hidden border border-white/10">
             <TomTomMap
                driverLat={selectedPoint.lat}
                driverLng={selectedPoint.lng}
                destLat={selectedPoint.lat}
                destLng={selectedPoint.lng}
                draggable={true}
                onDragEnd={async (lat, lng) => {
                  try {
                    const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}`);
                    const data = await res.json();
                    const address = data.addresses?.[0]?.address;
                    if (address) {
                      setSelectedPoint({
                        lat,
                        lng,
                        displayName: [address.streetName, address.municipalitySubdivision || address.municipality, address.extendedPostalCode || address.postalCode].filter(Boolean).join(', ')
                      });
                    } else {
                      setSelectedPoint({ ...selectedPoint, lat, lng });
                    }
                  } catch (e) {
                    console.error(e);
                    setSelectedPoint({ ...selectedPoint, lat, lng });
                  }
                }}
              />
          </div>
          <p className="text-xs text-white/60 leading-relaxed break-words">{selectedPoint.displayName}</p>
          {!isAdmin && (
            <label className="flex items-center gap-3 cursor-pointer mt-2 bg-black/20 p-3 rounded-xl border border-white/5">
              <input
                type="checkbox"
                checked={saveToAccount}
                onChange={e => setSaveToAccount(e.target.checked)}
                className="w-4 h-4 accent-apollo-orange"
              />
              <span className="text-xs font-medium text-white/80">Salvar este endereço na minha conta para uso futuro</span>
            </label>
          )}
          {errorMsg && <p className="text-xs font-bold text-red-500">{errorMsg}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                // If there were multiple results, go back to results list, else go to manual form
                if (results.length > 1) {
                  setMode('results');
                } else {
                  setMode('manual');
                  setResults([]);
                }
                setSelectedPoint(null);
              }}
              className="flex-1 py-2 text-xs font-bold bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
            >
              Não, tentar novamente
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleConfirmSelection(selectedPoint)}
              className="flex-1 py-2 text-xs font-bold bg-apollo-orange text-white rounded-lg hover:bg-apollo-orange/90 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, é esse'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
