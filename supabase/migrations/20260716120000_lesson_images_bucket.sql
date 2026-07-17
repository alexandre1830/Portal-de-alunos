-- =====================================================================
-- Bucket `lesson-images`: imagens dos blocos de conteúdo das lições.
--
-- Diferente do bucket `avatars` (onde cada usuário gerencia o próprio
-- diretório), aqui só o ADMIN escreve — imagem de lição é material
-- didático, não conteúdo de usuário. Leitura é pública: o aluno precisa
-- ver a imagem, e a URL não expõe nada além do próprio material.
--
-- Convenção de path: lesson-images/<course_id>/<arquivo>. Agrupar por
-- curso facilita auditar/limpar material de um curso removido.
-- =====================================================================

insert into storage.buckets (id, name, public)
  values ('lesson-images', 'lesson-images', true)
  on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'lesson_images_admin_insert'
  ) then
    create policy "lesson_images_admin_insert" on storage.objects
      for insert to authenticated
      with check ( bucket_id = 'lesson-images' and private.is_admin() );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'lesson_images_admin_update'
  ) then
    create policy "lesson_images_admin_update" on storage.objects
      for update to authenticated
      using ( bucket_id = 'lesson-images' and private.is_admin() )
      with check ( bucket_id = 'lesson-images' and private.is_admin() );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'lesson_images_admin_delete'
  ) then
    create policy "lesson_images_admin_delete" on storage.objects
      for delete to authenticated
      using ( bucket_id = 'lesson-images' and private.is_admin() );
  end if;

  -- Leitura pública: o aluno (e o <img> do browser, sem token) precisa
  -- carregar a imagem do material da lição.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'lesson_images_public_read'
  ) then
    create policy "lesson_images_public_read" on storage.objects
      for select to anon, authenticated
      using ( bucket_id = 'lesson-images' );
  end if;
end $$;
