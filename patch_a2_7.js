const fs = require('fs');
const path = './apollo-pizzaria/app/(admin)/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will just REMOVE the `isLoading ? skeleton : profile` logic entirely.
// Instead, I will render the `profile` conditionally, or use the fallback 'Usuário'.
// Actually, why wait for `isLoading` at all? If `isLoading` is true but `profile` is populated (e.g. from local state or cache), we can just show it.
// Wait, `useUser()` initially starts with `isLoading = true`, `profile = null`.
// If I just render `{profile?.full_name || 'Carregando...'}`, it will show 'Carregando...'.
// Let's replace the whole `ml-auto flex items-center gap-4` div content with a single structure that handles both states smoothly.

const oldHeaderProfile = `<div className="ml-auto flex items-center gap-4">
            {isLoading ? (
              <div className="animate-pulse flex items-center gap-4">
                <div className="flex flex-col items-end mr-2 gap-1">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-end mr-2">
                  <p className="font-bold text-sm leading-none">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs text-[#0D0D0D]/60 capitalize">
                    {profile?.role}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-apollo-orange/10 border border-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#0D0D0D]/60 hover:text-red-500 transition-colors"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>`;

const newHeaderProfile = `<div className="ml-auto flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <p className="font-bold text-sm leading-none">
                {isLoading ? 'Carregando...' : (profile?.full_name || 'Usuário')}
              </p>
              <p className="text-xs text-[#0D0D0D]/60 capitalize">
                {isLoading ? '...' : (profile?.role || '')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-apollo-orange/10 border border-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold">
              {isLoading ? '...' : (profile?.full_name?.charAt(0) || 'U')}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-[#0D0D0D]/60 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>`;

content = content.replace(oldHeaderProfile, newHeaderProfile);

fs.writeFileSync(path, content);
console.log("Patched layout.tsx hydration logic simpler");
