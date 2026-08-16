import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trees } from '../api/endpoints';
import { useI18n } from '../i18n/I18nContext';
import ConfirmModal from '../components/ConfirmModal';
import Footer from '../components/Footer';
import UserMenu from '../components/UserMenu';
import { isValidName, stripDigits } from '../utils/nameValidation';

interface Tree {
  id: number;
  name: string;
  createdAt: string;
}

export default function TreeListPage() {
  const [treeList, setTreeList] = useState<Tree[]>([]);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [renameTarget, setRenameTarget] = useState<Tree | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const { t, toggleLang } = useI18n();
  const navigate = useNavigate();

  const loadTrees = async () => {
    const data = await trees.list();
    setTreeList(data);
  };

  useEffect(() => {
    loadTrees();
  }, []);

  const createTree = async () => {
    const name = stripDigits(newName.trim());
    if (!name) {
      setNameError(t.nameRequired);
      return;
    }
    if (!isValidName(name)) {
      setNameError(t.nameInvalidChars);
      return;
    }
    setNameError('');
    const tree = await trees.create(name);
    setNewName('');
    navigate(`/trees/${tree.id}`);
  };

  const deleteTree = (id: number) => {
    setDeleteTarget(id);
  };

  const confirmDeleteTree = async () => {
    if (deleteTarget === null) return;
    await trees.delete(deleteTarget);
    setDeleteTarget(null);
    loadTrees();
  };

  const openRename = (tree: Tree) => {
    setRenameTarget(tree);
    setRenameValue(tree.name);
    setRenameError('');
  };

  const confirmRenameTree = async () => {
    if (renameTarget === null) return;
    const name = stripDigits(renameValue.trim());
    if (!name) {
      setRenameError(t.nameRequired);
      return;
    }
    if (!isValidName(name)) {
      setRenameError(t.nameInvalidChars);
      return;
    }
    setRenameError('');
    await trees.update(renameTarget.id, { name });
    setRenameTarget(null);
    loadTrees();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">🌳 {t.appName}</h1>
          <div className="flex items-center gap-4">
            <button onClick={toggleLang} className="text-xs text-gray-500 hover:text-emerald-400 transition">
              {t.langSwitch}
            </button>
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">{t.myTrees}</h2>
          <p className="text-gray-400">{t.treeDesc}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setNameError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && createTree()}
            placeholder={t.treePlaceholder}
            className={`flex-1 px-4 py-2.5 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
              nameError ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          <button
            onClick={createTree}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition shadow-lg cursor-pointer"
          >
            {t.create}
          </button>
        </div>
        {nameError && (
          <p className="text-red-400 text-sm mb-6">⚠️ {nameError}</p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {treeList.map((tree) => (
            <div
              key={tree.id}
              className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-emerald-600/50 transition group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className="text-lg font-semibold text-white cursor-pointer hover:text-emerald-400 transition"
                    onClick={() => navigate(`/trees/${tree.id}`)}
                  >
                    {tree.name}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {t.created} {new Date(tree.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => navigate(`/trees/${tree.id}`)}
                    className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30 transition"
                  >
                    {t.open}
                  </button>
                  <button
                    onClick={() => openRename(tree)}
                    className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-600/30 transition"
                    title={t.rename}
                  >
                    ✏️ {t.rename}
                  </button>
                  <button
                    onClick={() => deleteTree(tree.id)}
                    className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {treeList.length === 0 && (
            <div className="col-span-2 text-center py-16 text-gray-500">
              {t.noTrees}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirm Modal */}
      {deleteTarget !== null && (
        <ConfirmModal
          title="🗑️ Delete Tree"
          message={t.deleteTreeConfirm}
          danger
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={confirmDeleteTree}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Rename Modal */}
      {renameTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setRenameTarget(null)}>
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white text-center mb-2">✏️ {t.renameTree}</h3>
            <input
              type="text"
              value={renameValue}
              autoFocus
              onChange={(e) => { setRenameValue(e.target.value); setRenameError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && confirmRenameTree()}
              placeholder={t.renamePlaceholder}
              className={`w-full px-4 py-2.5 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition mb-2 ${
                renameError ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {renameError && <p className="text-red-400 text-sm mb-2">⚠️ {renameError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmRenameTree}
                className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition cursor-pointer"
              >
                {t.rename}
              </button>
              <button
                onClick={() => setRenameTarget(null)}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition cursor-pointer"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
