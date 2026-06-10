export CORRECT_NAME="mmedcon-tech"
export CORRECT_EMAIL="mmedcon.it@gmail.com"

git filter-branch -f --env-filter "
export GIT_COMMITTER_NAME=`"\$CORRECT_NAME`"
export GIT_COMMITTER_EMAIL=`"\$CORRECT_EMAIL`"
export GIT_AUTHOR_NAME=`"\$CORRECT_NAME`"
export GIT_AUTHOR_EMAIL=`"\$CORRECT_EMAIL`"
" --tag-name-filter cat -- --all
