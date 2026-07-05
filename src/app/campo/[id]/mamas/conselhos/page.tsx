import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/mamas/Header'

export const dynamic = 'force-dynamic'

const CONSELHOS: { titulo: string; emoji: string; dicas: string[] }[] = [
  {
    titulo: 'Preparação antes do campo',
    emoji: '📋',
    dicas: [
      'Faz a ementa antes do campo — ajuda a estimar quantidades e facilita as compras.',
      'Imprime ou guarda offline a lista de restrições alimentares antes de sair para o terreno.',
      'Reserva sempre 10-15% do orçamento para imprevistos e reposições de última hora.',
      'Confirma as quantidades com o diretor: número de animados, monitores e convidados esperados.',
    ],
  },
  {
    titulo: 'Compras e gestão de stock',
    emoji: '🛒',
    dicas: [
      'Compra os alimentos não-perecíveis logo no início do campo para garantir que não faltam.',
      'Guarda sempre o talão de compra junto à fatura registada — facilitam a reconciliação de contas.',
      'Usa os preços de referência disponíveis na app para comparar e não pagar além do razoável.',
      'Verifica o que ainda há em stock antes de cada compra para evitar duplicação.',
      'Em promoções pontuais, aproveita se o produto couber no orçamento e tiver boa validade.',
    ],
  },
  {
    titulo: 'Refeições e cozinha',
    emoji: '🍳',
    dicas: [
      'Prepara e conta as porções antes de servir — evita desperdício e garante que chega para todos.',
      'Mantém sempre água fresca e acessível durante todo o dia, especialmente no verão.',
      'Em dias de calor intenso, prefere refeições frias ou fáceis de comer (saladas, tostas, fruta).',
      'Descasca e corta legumes na véspera para ganhar tempo e facilitar a manhã seguinte.',
      'Para grupos grandes, cozinha massas e arroz em água abundante e bem salgada — evita que colem.',
      'Prepara a mesa antes de terminar a refeição anterior: poupa tempo e mantém o ritmo.',
    ],
  },
  {
    titulo: 'Alergias e restrições alimentares',
    emoji: '⚠️',
    dicas: [
      'Verifica a lista de restrições alimentares todos os dias — podem surgir situações novas durante o campo.',
      'Para alergias graves (glúten, frutos secos), usa utensílios e superfícies separados.',
      'Em caso de dúvida sobre um ingrediente, lê o packaging — nunca improvisar com alergias.',
      'Marca visualmente os pratos ou tabuleiros das crianças com restrições para não haver confusões.',
      'Avisa sempre o animador responsável por um animado com alergia quando o prato é diferente.',
    ],
  },
  {
    titulo: 'Higiene e segurança alimentar',
    emoji: '🧼',
    dicas: [
      'Lava as mãos antes e depois de manusear alimentos, especialmente carne crua.',
      'Guarda as sobras tapadas e no frigorífico; consome nas 24 horas seguintes.',
      'Descongela carne no frigorífico — nunca à temperatura ambiente.',
      'Verifica a validade dos produtos antes de usar, em especial laticínios e iogurtes.',
      'Mantém a área de cozinha limpa e arrumada: evita acidentes, insetos e contaminações cruzadas.',
    ],
  },
  {
    titulo: 'Truques do dia a dia',
    emoji: '💡',
    dicas: [
      'Usa luvas de látex para cortar ingredientes com cheiro forte (cebola, alho) — poupa tempo de lavagem.',
      'Um termómetro de cozinha simples poupa muitas dúvidas com carne de porco e frango.',
      'Se falta algo a meio do campo, consulta o diretor antes de comprar — pode ser coberto pelo orçamento.',
      'Anota na app os ajustes de receita que fizeste e resultaram bem, para repetir noutros campos.',
      'Quando uma receita não ficou como esperado, partilha nos comentários da receita para avisar as próximas mamãs.',
    ],
  },
]

export default async function ConselhosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const { data: campo } = await supabase.from('campos').select('id, nome').eq('id', id).single()
  if (!campo) notFound()

  return (
    <>
      <Header title="Conselhos" backHref={`/campo/${id}/mamas`} />
      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-5">
        <p className="text-sm text-gray-500">
          Dicas práticas e sugestões das mamãs CAMTIL. Conteúdo fixo, atualizado pela direção.
        </p>

        {CONSELHOS.map((secao) => (
          <div key={secao.titulo} className="bg-white border border-[#E7E8D1] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#2D5016]/5 border-b border-[#E7E8D1]">
              <span className="text-lg">{secao.emoji}</span>
              <h2 className="font-bold text-sm text-[#2D5016]">{secao.titulo}</h2>
            </div>
            <ul className="divide-y divide-[#E7E8D1]">
              {secao.dicas.map((dica, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <span className="text-[#2D5016] font-bold text-xs mt-0.5 shrink-0">·</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{dica}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
