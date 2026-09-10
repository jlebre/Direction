export default function AcessoInvalidoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-3">
        <p className="text-4xl">🔒</p>
        <h1 className="text-lg font-bold text-[#36454F]">Link inválido</h1>
        <p className="text-sm text-gray-500">
          Este link de acesso não é válido, já expirou ou foi revogado. Pede um novo link a quem gere o campo.
        </p>
      </div>
    </main>
  )
}
