target=${1:-http://localhost:9001/text.txt?size=10000}
while true
do
    for i in $(seq 100)
    do
        curl $target > /dev/null &
    done

    wait
done